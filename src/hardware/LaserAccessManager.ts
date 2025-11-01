
import debugLib from 'debug'
import { config } from '../Configuration'
import { Led } from './Led'
import { gpios, ON, OFF } from './GpiosConstants'
import { Gpio as RealGpio } from 'onoff';
import { Gpio as MockGpio } from './MockGpio';

import { EventEmitter } from 'events'
import { mqttManager } from '../comms/MqttManager'
import { VhsApi } from '../comms/VhsApi'

let Gpio: typeof RealGpio | typeof MockGpio

const debug = debugLib("laser:accessmanager")

// determine if we can use real GPIOs or need to fallback to mock
try {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const testGpio = new RealGpio(gpios.GPIO_LASER, 'out') // the only way to know if real gpios are available is to try
  Gpio = RealGpio
  debug('Starting with real GPIOs')
} catch (err) {
  Gpio = MockGpio
  debug('Starting with mocked GPIOs', err)
}

type EventHardware = 'blower' | 'laser' | 'chiller';
const HwEventMaker = (hardware: EventHardware) => {
  return {
    Started: { channel: 'laser', id: `${hardware}-started`, name: `${hardware} started` },
    Shutdown: { channel: 'laser', id: `${hardware}-shutdown`, name: `${hardware} shutdown` }
  }
}

const Events = {
  // events about the state of the laser hardware, used for debugging
  Hardware: {
    Blower: HwEventMaker('blower'),
    Chiller: HwEventMaker('chiller'),
    Laser: HwEventMaker('laser')
  },
  // events about the overall status of the laser, shown to the user
  Status: {
    Shutdown: { channel: 'status', id: 'shutdown', name: 'Shutdown' },
    Ready: { channel: 'status', id: 'ready', name: 'Ready' },
    Starting: { channel: 'status', id: 'starting', name: 'Starting' },
    ShuttingDown: { channel: 'status', id: 'shuttingDown', name: 'Shutting down' as string }
  },
  // events about access, not directly shown but sets the big button to green or red
  Access: {
    Granted: { channel: 'access', id: 'access-granted', name: 'Access granted' },
    Pending: { channel: 'access', id: 'access-pending', name: 'Access pending' }
  }
}

export namespace Dispatch {
  export enum Channel {
    Laser = 'laser', // hardware events
    Status = 'status', // overall laser status events
    Access = "access" // switch is locked or unlocked
  }

  // these are the events that we expect to receive
  export interface OutgoingEvent {
    id: string
    name: string
    channel: string
  }

  // these are the events we expect to emit
  export interface ReceivedEvent {
    name: string
    id: string
  }

  export class Manager {
    private emitter = new EventEmitter();

    public emit(event: OutgoingEvent) {
      this.emitter.emit(event.channel, { id: event.id, name: event.name })
    }

    public on(event: Channel, listener: (...args: any[]) => void) {
      return this.emitter.on(event, listener)
    }
  }
}

function delay(delay: number) {
    return new Promise(function(resolve) {
        setTimeout(resolve, delay);
    });
}

class LaserAccessManager {
  pins = {
    laser: new Gpio(gpios.GPIO_LASER, 'out'),
    blower: new Gpio(gpios.GPIO_BLOWER, 'out'),
    chiller: new Gpio(gpios.GPIO_CHILLER, 'out'),
    mainSwitch: new Gpio(gpios.GPIO_MAIN_SWITCH, 'in', 'both'),
    LEDs: {
      green: new Led(new Gpio(gpios.GPIO_LED_GREEN, 'out')),
      red: new Led(new Gpio(gpios.GPIO_LED_RED, 'out'))
    }
  }

  private dispatch = new Dispatch.Manager()
  private startTimers: any = {}

  private state = {
    laserWasStarted: false,
    chillerRunning: false,
    authorized: false,
    status: Events.Status.Shutdown
  };

  private disableAccessTimer: any = null
  private switchTimeout: any = null

  constructor() {
    this.pins.LEDs.red.enable()

    // Watch the main physical switch for changes
    this.pins.mainSwitch.watch(() => {
      clearTimeout(this.switchTimeout)
      this.switchTimeout = setTimeout(() => {
        if (this.mainSwitchOn()) {
          this.startAll()
        } else {
          this.shutdownAll()
        }
      }, 500)
    })
  }

  public startLaser() {
    if (!this.pins.chiller.readSync()) {
      return Promise.reject('Chiller is not running')
    }

    if (!this.pins.blower.readSync()) {
      return Promise.reject('Blower is not running')
    }

    debug('Laser started')
    this.state.laserWasStarted = true
    this.dispatch.emit(Events.Hardware.Laser.Started)

    VhsApi.statusUpdate('on')
      .then(function () {
        debug('updated api - startup')
      })
      .catch(function () {
        debug('error updating api - startup')
      })
    return this.pins.laser.write(ON)
  }

  public shutdownLaser() {
    debug('Laser shutdown')

    VhsApi.statusUpdate('off').then(function () {
      debug('updated api - shutdown')
    }).catch(function () {
      debug('error updating api - shutdown')
    })

    this.state.laserWasStarted = false
    this.dispatch.emit(Events.Hardware.Laser.Shutdown)
    return this.pins.laser.write(OFF)
  }

  public startBlower() {
    debug('Blower started')
    this.dispatch.emit(Events.Hardware.Blower.Started)
    return this.pins.blower.write(ON)
  }

  public shutdownBlower() {
    if (this.pins.laser.readSync() === ON) {
      return Promise.reject('Laser is running, will not shutdown blower')
    }
    debug('Blower shutdown')
    this.dispatch.emit(Events.Hardware.Blower.Shutdown)
    return this.pins.blower.write(OFF)
  }

  public startChiller() {
    debug('Chiller started')
    this.dispatch.emit(Events.Hardware.Chiller.Started)
    return this.pins.chiller.write(ON)
  }

  public shutdownChiller() {
    if (this.pins.laser.readSync() === ON) {
      return Promise.reject('Laser is running, will not shutdown chiller')
    }

    debug('Chiller shutdown')

    this.state.chillerRunning = false

    this.dispatch.emit(Events.Hardware.Chiller.Shutdown)
    return this.pins.chiller.write(OFF)
  }

  public mainSwitchOn() {
    return this.pins.mainSwitch.readSync() === ON
  }

  private setStatus(s: Dispatch.OutgoingEvent) {
    this.state.status = s
    this.dispatch.emit(s)
  }

  public getStatus() {
    return this.state.status
  }

  public async startAll(): Promise<any> {
    this.startTimers.abortStartup = false

    if (!this.state.authorized) {
      this.pins.LEDs.red.blink(150)
      setTimeout(() => {
        this.pins.LEDs.red.enable()
      }, 2000)
      return Promise.reject('Access Denied')
    }

    if (mqttManager.maintenanceStatus !== 'ok') {
      this.pins.LEDs.red.blink(150)
      setTimeout(() => {
        this.pins.LEDs.red.enable()
      }, 2000)
      return Promise.reject('Maintenance Overdue: Access Denied')
    }

    const startLaserAndBlower = () => {
      this.pins.LEDs.green.enable()
      this.setStatus(Events.Status.Ready)
      return Promise.all([this.startBlower(), this.startLaser()])
    }

    if (this.startTimers.shutdown) {
      this.startTimers.abortShutdown = true
    }

    if (this.state.chillerRunning) {
      debug('Chiller was already running, starting laser and blower immediately')
      return startLaserAndBlower()
    }

    this.pins.LEDs.green.blink(300)
    this.setStatus(Events.Status.Starting)

    await this.startChiller()

    this.startTimers.startup = null
    if (this.startTimers.abortStartup) {
      debug('Startup aborted')
      return Promise.resolve('Startup aborted')
    }

    this.state.chillerRunning = true
    return startLaserAndBlower()
  }

  public async shutdownAll(): Promise<any> {
    if (this.startTimers.shutdown && !this.startTimers.abortShutdown) {
      debug("Shutdown requested but it's already in progress")
      return
    }
    this.startTimers.abortShutdown = false
    this.setStatus(Events.Status.ShuttingDown)

    if (this.state.laserWasStarted) {
      const fiveMin = 5 * 60 * 1000;
      await this.shutdownLaser()
      await this.pins.LEDs.green.blink(300)

      await new Promise((resolve, reject)=>{
        this.startTimers.shutdown = setTimeout(() => {
          this.startTimers.shutdown = null
          if (this.startTimers.abortShutdown) {
            reject('Shutdown aborted')
          } else {
            this.setStatus(Events.Status.Shutdown)
            this.pins.LEDs.green.disable()
            return Promise.all([this.shutdownBlower(), this.shutdownChiller()])
              .then(resolve)
          }
        }, 5 * 60 * 1000)
      }).catch((err)=>{
        console.log(err)
      })

      return;
      return new Promise((resolve, reject) => {
        this.startTimers.shutdown = setTimeout(() => {
          this.startTimers.shutdown = null
          if (this.startTimers.abortShutdown) {
            resolve('Shutdown aborted')
          } else {
            this.setStatus(Events.Status.Shutdown)
            this.pins.LEDs.green.disable()
            Promise.all([this.shutdownBlower(), this.shutdownChiller()])
              .then(resolve)
              .catch(reject)
          }
        }, 5 * 60 * 1000)
      })

      return new Promise((resolve, reject) => {
        this.shutdownLaser()
          .then(() => this.pins.LEDs.green.blink(300))
          .then(() => {
            this.startTimers.shutdown = setTimeout(() => {
              this.startTimers.shutdown = null
              if (this.startTimers.abortShutdown) {
                resolve('Shutdown aborted')
              } else {
                this.setStatus(Events.Status.Shutdown)
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
      this.setStatus(Events.Status.Shutdown)
      return Promise.all([this.shutdownLaser(), this.shutdownBlower(), this.shutdownChiller()])
    }
  }

  public grantAccess() {
    debug('Grant access request')
    this.state.authorized = true
    this.dispatch.emit(Events.Access.Granted)
    if (this.disableAccessTimer) {
      clearTimeout(this.disableAccessTimer)
    }
    this.disableAccessTimer = setTimeout(() => {
      this.dispatch.emit(Events.Access.Pending)
      this.state.authorized = false
      this.disableAccessTimer = null
    }, 20000)
  }

  public on(event: Dispatch.Channel, listener: (...args: any[]) => void) {
    return this.dispatch.on(event, listener)
  }
}

export const manager = new LaserAccessManager()

export const LEDs = manager.pins.LEDs
