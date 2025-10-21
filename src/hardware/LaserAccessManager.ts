import CryptoJS from 'crypto-js'
import debugLib from 'debug'
import { config } from '../Configuration'
import { Led } from './Led'
import { gpios, ON, OFF } from './GpiosConstants'
import { Gpio as RealGpio } from 'onoff';
import { Gpio as MockGpio } from './MockGpio';

import { EventEmitter } from 'events'
import { maintenanceStatus } from '../mqtt'

let Gpio: typeof RealGpio | typeof MockGpio

try {
  // try creating a GPIO to ensure availability
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const testGpio = new RealGpio(gpios.GPIO_LASER, 'out')
  Gpio = RealGpio
  debugLib('starting with real GPIOs')
} catch (_err) {
  // fallback to test mock implementation in src/mock-gpio
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Gpio = MockGpio
  debugLib('starting with mocked GPIOs')
}

export interface LaserStatusEvent {
    id: "shutdown" | "ready" | "starting" | "shuttingDown",
    name: string
}

const StatusShutdown: LaserStatusEvent = { id: 'shutdown', name: 'Shutdown' }
const StatusReady: LaserStatusEvent = { id: 'ready', name: 'Ready' }
const StatusStarting: LaserStatusEvent = { id: 'starting', name: 'Starting' }
const StatusShuttingDown: LaserStatusEvent = { id: 'shuttingDown', name: 'Shutting Down' }

class LaserAccessManager {
  private pins: {
    laser: any
    blower: any
    chiller: any
    mainSwitch: any
    LEDs: { green: Led; red: Led }
  }
  private emitter = new EventEmitter()
  private startTimers: any = {}
  private state: {
    laserWasStarted: boolean
    chillerRunning: boolean
    authorized: boolean
    status: LaserStatusEvent
  }
  private disableAccessTimer: any = null
  private switchTimeout: any = null

  constructor() {
    this.pins = {
      laser: new Gpio(gpios.GPIO_LASER, 'out'),
      blower: new Gpio(gpios.GPIO_BLOWER, 'out'),
      chiller: new Gpio(gpios.GPIO_CHILLER, 'out'),
      mainSwitch: new Gpio(gpios.GPIO_MAIN_SWITCH, 'in', 'both'),
      LEDs: {
        green: new Led(new Gpio(gpios.GPIO_LED_GREEN, 'out')),
        red: new Led(new Gpio(gpios.GPIO_LED_RED, 'out'))
      }
    }

    this.state = {
      laserWasStarted: false,
      chillerRunning: false,
      authorized: false,
      status: StatusShutdown
    }

    this.pins.LEDs.red.enable()

    // wire main switch watcher
    this.pins.mainSwitch.watch(() => {
      clearTimeout(this.switchTimeout)
      this.switchTimeout = setTimeout(() => {
        if (this.mainSwitchOn()) {
          void this.startAll()
        } else {
          void this.shutdownAll()
        }
      }, 500)
    })
  }

  // expose LEDs
  public get LEDs() {
    return this.pins.LEDs
  }

  private sendAPILaserUpdate(statusStr: string) {
    const ts = Math.floor(Date.now() / 1000)
    const requestURI = '/s/vhs/data/laser/update'

    const formdata: any = {}
    formdata.value = statusStr
    formdata.ts = '' + ts
    formdata.client = config.api.clientName

    const jsonData = JSON.stringify(formdata)

    const key = ts + jsonData + config.api.clientSecret

    const hash = CryptoJS.HmacSHA256(jsonData, key)

    const signedRequestUrl = config.api.baseUrl + requestURI + '?hash=' + hash

    return fetch(signedRequestUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: jsonData
    }).then((response) => response.json())
  }

  public startLaser() {
    if (!this.pins.chiller.readSync()) {
      return Promise.reject('Chiller is not running')
    }
    if (!this.pins.blower.readSync()) {
      return Promise.reject('Blower is not running')
    }

    debugLib('Laser started')
    this.state.laserWasStarted = true
    this.emitter.emit('laser', { id: 'laserStarted', name: 'Laser Started' })

    this.sendAPILaserUpdate('on')
      .then(function () {
        debugLib('updated api - startup')
      })
      .catch(function () {
        debugLib('error updating api - startup')
      })
    return this.pins.laser.write(ON)
  }

  public shutdownLaser() {
    debugLib('Laser shutdown')
    this.sendAPILaserUpdate('off')
      .then(function () {
        debugLib('updated api - shutdown')
      })
      .catch(function () {
        debugLib('error updating api - shutdown')
      })
    this.state.laserWasStarted = false
    this.emitter.emit('laser', { id: 'laserShutdown', name: 'Laser Shutdown' })
    return this.pins.laser.write(OFF)
  }

  public startBlower() {
    debugLib('Blower started')
    this.emitter.emit('laser', { id: 'blowerStarted', name: 'Blower Started' })
    return this.pins.blower.write(ON)
  }

  public shutdownBlower() {
    if (this.pins.laser.readSync() === ON) {
      return Promise.reject('Laser is running, will not shutdown blower')
    }
    debugLib('Blower shutdown')
    this.emitter.emit('laser', { id: 'blowerShutdown', name: 'Blower Shutdown' })
    return this.pins.blower.write(OFF)
  }

  public startChiller() {
    debugLib('Chiller started')
    this.emitter.emit('laser', {
      id: 'chillerStarted',
      name: 'Chiller/Compressor Started'
    })
    return this.pins.chiller.write(ON)
  }

  public shutdownChiller() {
    if (this.pins.laser.readSync() === ON) {
      return Promise.reject('Laser is running, will not shutdown chiller')
    }
    debugLib('Chiller shutdown')
    this.state.chillerRunning = false
    this.emitter.emit('laser', {
      id: 'chillerShutdown',
      name: 'Chiller/Comperssor Shutdown'
    })
    return this.pins.chiller.write(OFF)
  }

  public mainSwitchOn() {
    return this.pins.mainSwitch.readSync() === ON
  }

  private setStatus(s: LaserStatusEvent) {
    this.state.status = s
    this.emitter.emit('status', s)
  }

  public getStatus() {
    return this.state.status
  }

  public startAll(): Promise<any> {
    this.startTimers.abortStartup = false

    return new Promise((resolve, reject) => {
      if (!this.state.authorized) {
        this.pins.LEDs.red.blink(150)
        setTimeout(() => {
          this.pins.LEDs.red.enable()
        }, 2000)
        return reject('Access Denied')
      }

      if (maintenanceStatus !== 'ok') {
        this.pins.LEDs.red.blink(150)
        setTimeout(() => {
          this.pins.LEDs.red.enable()
        }, 2000)
        return reject('Maintenance Overdue: Access Denied')
      }

      const startLaserAndBlower = () => {
        this.pins.LEDs.green.enable()
        this.setStatus(StatusReady)
        return Promise.all([this.startBlower(), this.startLaser()])
          .then(resolve)
          .catch(reject)
      }

      if (this.startTimers.shutdown) {
        this.startTimers.abortShutdown = true
      }

      if (this.state.chillerRunning) {
        debugLib('Chiller was already running, starting laser and blower immediately')
        return startLaserAndBlower()
      }

      this.pins.LEDs.green.blink(300)
      this.setStatus(StatusStarting)

      this.startChiller().then(() => {
        this.startTimers.startup = null
        if (this.startTimers.abortStartup) {
          debugLib('Startup aborted')
          resolve('Startup aborted')
        } else {
          this.state.chillerRunning = true
          startLaserAndBlower()
        }
      })
    })
  }

  public shutdownAll(): Promise<any> | void {
    if (this.startTimers.shutdown && !this.startTimers.abortShutdown) {
      debugLib("Shutdown requested but it's already in progress")
      return
    }
    this.startTimers.abortShutdown = false
    this.setStatus(StatusShuttingDown)

    if (this.state.laserWasStarted) {
      return new Promise((resolve, reject) => {
        this.shutdownLaser()
          .then(() => this.pins.LEDs.green.blink(300))
          .then(() => {
            this.startTimers.shutdown = setTimeout(() => {
              this.startTimers.shutdown = null
              if (this.startTimers.abortShutdown) {
                resolve('Shutdown aborted')
              } else {
                this.setStatus(StatusShutdown)
                this.pins.LEDs.green.disable()
                Promise.all([this.shutdownBlower(), this.shutdownChiller()])
                  .then(resolve)
                  .catch(reject)
              }
            }, 5 * 60 * 1000)
          })
      })
    } else {
      this.startTimers.abortStartup = true
      this.pins.LEDs.green.disable()
      this.setStatus(StatusShutdown)
      return Promise.all([this.shutdownLaser(), this.shutdownBlower(), this.shutdownChiller()])
    }
  }

  public grantAccess() {
    debugLib('Grant access request')
    this.state.authorized = true
    this.emitter.emit('access', 'access granted')
    if (this.disableAccessTimer) {
      clearTimeout(this.disableAccessTimer)
    }
    this.disableAccessTimer = setTimeout(() => {
      this.emitter.emit('access', 'awaiting access')
      this.state.authorized = false
      this.disableAccessTimer = null
    }, 20000)
  }

  public on(event: string, listener: (...args: any[]) => void) {
    return this.emitter.on(event, listener)
  }
}

export const manager = new LaserAccessManager()

export const LEDs = manager.LEDs
