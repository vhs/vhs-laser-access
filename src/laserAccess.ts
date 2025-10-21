import CryptoJS from 'crypto-js'
import debugLib from 'debug'
import { config } from './config'
import { Led } from './led'
import { gpios, ON, OFF } from './constants'
import { Gpio as RealGpio } from 'onoff';
import { Gpio as MockGpio } from './mock-gpio';

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

import { EventEmitter } from 'events'
import { maintenanceStatus } from './mqtt'

const pins = {
    laser: new Gpio(gpios.GPIO_LASER, 'out'),
    blower: new Gpio(gpios.GPIO_BLOWER, 'out'),
    chiller: new Gpio(gpios.GPIO_CHILLER, 'out'),
    mainSwitch: new Gpio(gpios.GPIO_MAIN_SWITCH, 'in', 'both'),
    LEDs: {
        green: new Led(new Gpio(gpios.GPIO_LED_GREEN, 'out')),
        red: new Led(new Gpio(gpios.GPIO_LED_RED, 'out'))
    }
}

const emitter = new EventEmitter()

pins.LEDs.red.enable()

export const LEDs = pins.LEDs;

export const Status = {
  shutdown: { id: 'shutdown', name: 'Shutdown' },
  ready: { id: 'ready', name: 'Ready' },
  starting: { id: 'starting', name: 'Starting' },
  shuttingDown: { id: 'shuttingDown', name: 'Shutting Down' }
}

const startTimers: any = {}

let state = {
    laserWasStarted: false,
    chillerRunning: false,
    authorized: false,
    status: Status.shutdown
}

function sendAPILaserUpdate(statusStr: string) {
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

export function startLaser() {
  if (!pins.chiller.readSync()) {
    return Promise.reject('Chiller is not running')
  }
  if (!pins.blower.readSync()) {
    return Promise.reject('Blower is not running')
  }

  debugLib('Laser started')
  state.laserWasStarted = true
  emitter.emit('laser', { id: 'laserStarted', name: 'Laser Started' });

  sendAPILaserUpdate('on')
    .then(function () {
      debugLib('updated api - startup')
    })
    .catch(function () {
      debugLib('error updating api - startup')
    })
  return pins.laser.write(ON)
}

export function shutdownLaser() {
  debugLib('Laser shutdown')
  sendAPILaserUpdate('off')
    .then(function () {
      debugLib('updated api - shutdown')
    })
    .catch(function () {
      debugLib('error updating api - shutdown')
    })
  state.laserWasStarted = false
  emitter.emit('laser', { id: 'laserShutdown', name: 'Laser Shutdown' })
  return pins.laser.write(OFF)
}

export function startBlower() {
  debugLib('Blower started')
  emitter.emit('laser', { id: 'blowerStarted', name: 'Blower Started' })
  return pins.blower.write(ON)
}

export function shutdownBlower() {
  if (pins.laser.readSync() === ON) {
    return Promise.reject('Laser is running, will not shutdown blower')
  }
  debugLib('Blower shutdown')
  emitter.emit('laser', { id: 'blowerShutdown', name: 'Blower Shutdown' })
  return pins.blower.write(OFF)
}

export function startChiller() {
  debugLib('Chiller started')
  emitter.emit('laser', {
    id: 'chillerStarted',
    name: 'Chiller/Compressor Started'
  })
  return pins.chiller.write(ON)
}

export function shutdownChiller() {
  if (pins.laser.readSync() === ON) {
    return Promise.reject('Laser is running, will not shutdown chiller')
  }
  debugLib('Chiller shutdown')
  state.chillerRunning = false
  emitter.emit('laser', {
    id: 'chillerShutdown',
    name: 'Chiller/Comperssor Shutdown'
  })
  return pins.chiller.write(OFF)
}

export function mainSwitchOn() {
  return pins.mainSwitch.readSync() === ON
}

function setStatus(s: any) {
  state.status = s
  emitter.emit('status', s)
}

export function getStatus() {
  return state.status
}

export function startAll(): Promise<any> {
  startTimers.abortStartup = false

  return new Promise(function (resolve, reject) {
    if (!state.authorized) {
      pins.LEDs.red.blink(150)
      setTimeout(function () {
        pins.LEDs.red.enable()
      }, 2000)
      return reject('Access Denied')
    }

    if (maintenanceStatus !== 'ok') {
      pins.LEDs.red.blink(150)
      setTimeout(function () {
        pins.LEDs.red.enable()
      }, 2000)
      return reject('Maintenance Overdue: Access Denied')
    }

    const startLaserAndBlower = function () {
      pins.LEDs.green.enable()
      setStatus(Status.ready)
      return Promise.all([startBlower(), startLaser()])
        .then(resolve)
        .catch(reject)
    }

    if (startTimers.shutdown) {
      startTimers.abortShutdown = true
    }

    if (state.chillerRunning) {
      debugLib('Chiller was already running, starting laser and blower immediately')
      return startLaserAndBlower()
    }

    pins.LEDs.green.blink(300)
    setStatus(Status.starting)

    startChiller().then(function () {
      startTimers.startup = null
      if (startTimers.abortStartup) {
        debugLib('Startup aborted')
        resolve('Startup aborted')
      } else {
        state.chillerRunning = true
        startLaserAndBlower()
      }
    })
  })
}

export function shutdownAll(): Promise<any> | void {
  if (startTimers.shutdown && !startTimers.abortShutdown) {
    debugLib("Shutdown requested but it's already in progress")
    return
  }
  startTimers.abortShutdown = false
  setStatus(Status.shuttingDown)

  if (state.laserWasStarted) {
    return new Promise(function (resolve, reject) {
      shutdownLaser()
        .then(function () {
          return pins.LEDs.green.blink(300)
        })
        .then(function () {
          startTimers.shutdown = setTimeout(function () {
            startTimers.shutdown = null
            if (startTimers.abortShutdown) {
              resolve('Shutdown aborted')
            } else {
              setStatus(Status.shutdown)
              pins.LEDs.green.disable()
              Promise.all([shutdownBlower(), shutdownChiller()])
                .then(resolve)
                .catch(reject)
            }
          }, 5 * 60 * 1000)
        })
    })
  } else {
    startTimers.abortStartup = true
    pins.LEDs.green.disable()
    setStatus(Status.shutdown)
    return Promise.all([shutdownLaser(), shutdownBlower(), shutdownChiller()])
  }
}

let disableAccessTimer: any

export function grantAccess() {
  debugLib('Grant access request')
  state.authorized = true
  emitter.emit('access', 'access granted')
  if (disableAccessTimer) {
    clearTimeout(disableAccessTimer)
  }
  disableAccessTimer = setTimeout(function () {
    emitter.emit('access', 'awaiting access')
    state.authorized = false
    disableAccessTimer = null
  }, 20000)
}

let switchTimeout: any

pins.mainSwitch.watch(function () {
  clearTimeout(switchTimeout)
  switchTimeout = setTimeout(function () {
    if (mainSwitchOn()) {
      return startAll()
    } else {
      return shutdownAll()
    }
  }, 500)
})

export function on(event: string, listener: (...args: any[]) => void) {
  return emitter.on(event, listener)
}
