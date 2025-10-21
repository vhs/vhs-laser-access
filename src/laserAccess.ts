import CryptoJS from 'crypto-js'
import debugLib from 'debug'
import config from '../config.json'
import { Led } from './led'
import { gpios, ON, OFF } from './constants'

let Gpio: any
try {
  Gpio = require('onoff').Gpio
  // try creating a GPIO to ensure availability
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const testGpio = new Gpio(gpios.GPIO_LASER, 'out')
  // console.log('starting with real GPIOs')
} catch (_err) {
  // fallback to mock
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Gpio = require('../test/mock-gpio').Gpio
  // console.log('starting with mocked GPIOs')
}

import { EventEmitter } from 'events'
import { maintenanceStatus } from './mqtt'

const laser = new Gpio(gpios.GPIO_LASER, 'out')
const blower = new Gpio(gpios.GPIO_BLOWER, 'out')
const chiller = new Gpio(gpios.GPIO_CHILLER, 'out')
const mainSwitch = new Gpio(gpios.GPIO_MAIN_SWITCH, 'in', 'both')
const LEDs = {
  green: new Led(new Gpio(gpios.GPIO_LED_GREEN, 'out')),
  red: new Led(new Gpio(gpios.GPIO_LED_RED, 'out'))
}

const emitter = new EventEmitter()

LEDs.red.enable()

export { LEDs }

export const Status = {
  shutdown: { id: 'shutdown', name: 'Shutdown' },
  ready: { id: 'ready', name: 'Ready' },
  starting: { id: 'starting', name: 'Starting' },
  shuttingDown: { id: 'shuttingDown', name: 'Shutting Down' }
} as const

const startTimers: any = {}
let laserWasStarted = false
let chillerRunning = false
let authorized = false
let status = Status.shutdown

function sendAPILaserUpdate(statusStr: string) {
  const ts = Math.floor(Date.now() / 1000)
  const requestURI = '/s/vhs/data/laser/update'

  const formdata: any = {}
  formdata.value = statusStr
  formdata.ts = '' + ts
  formdata.client = (config as any).api.clientName

  const jsonData = JSON.stringify(formdata)

  const key = ts + jsonData + (config as any).api.clientSecret

  const hash = CryptoJS.HmacSHA256(jsonData, key)

  const signedRequestUrl = (config as any).api.baseUrl + requestURI + '?hash=' + hash

  return fetch(signedRequestUrl, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: jsonData
  }).then((response) => response.json())
}

function startLaser() {
  if (!chiller.online) {
    return Promise.reject('Chiller is not running')
  }
  if (!blower.online) {
    return Promise.reject('Blower is not running')
  }

  debugLib('Laser started')
  laserWasStarted = true
  emitter.emit('laser', { id: 'laserStarted', name: 'Laser Started' })
  ;(laser as any).online = true
  sendAPILaserUpdate('on')
    .then(function () {
      debugLib('updated api - startup')
    })
    .catch(function () {
      debugLib('error updating api - startup')
    })
  return (laser as any).write(ON)
}

function shutdownLaser() {
  debugLib('Laser shutdown')
  sendAPILaserUpdate('off')
    .then(function () {
      debugLib('updated api - shutdown')
    })
    .catch(function () {
      debugLib('error updating api - shutdown')
    })
  laserWasStarted = false
  emitter.emit('laser', { id: 'laserShutdown', name: 'Laser Shutdown' })
  ;(laser as any).online = false
  return (laser as any).write(OFF)
}

function startBlower() {
  debugLib('Blower started')
  emitter.emit('laser', { id: 'blowerStarted', name: 'Blower Started' })
  ;(blower as any).online = true
  return (blower as any).write(ON)
}

function shutdownBlower() {
  if ((laser as any).online) {
    return Promise.reject('Laser is running, will not shutdown blower')
  }
  debugLib('Blower shutdown')
  emitter.emit('laser', { id: 'blowerShutdown', name: 'Blower Shutdown' })
  ;(blower as any).online = false
  return (blower as any).write(OFF)
}

function startChiller() {
  debugLib('Chiller started')
  emitter.emit('laser', {
    id: 'chillerStarted',
    name: 'Chiller/Compressor Started'
  })
  ;(chiller as any).online = true
  return (chiller as any).write(ON)
}

function shutdownChiller() {
  if ((laser as any).online) {
    return Promise.reject('Laser is running, will not shutdown chiller')
  }
  debugLib('Chiller shutdown')
  chillerRunning = false
  emitter.emit('laser', {
    id: 'chillerShutdown',
    name: 'Chiller/Comperssor Shutdown'
  })
  ;(chiller as any).online = false
  return (chiller as any).write(OFF)
}

function mainSwitchOn() {
  return (mainSwitch as any).readSync() === ON
}

function setStatus(s: any) {
  status = s
  emitter.emit('status', s)
}

function getStatus() {
  return status
}

export function startAll(): Promise<any> {
  startTimers.abortStartup = false

  return new Promise(function (resolve, reject) {
    if (!authorized) {
      LEDs.red.blink(150)
      setTimeout(function () {
        LEDs.red.enable()
      }, 2000)
      return reject('Access Denied')
    }

    if (maintenanceStatus !== 'ok') {
      LEDs.red.blink(150)
      setTimeout(function () {
        LEDs.red.enable()
      }, 2000)
      return reject('Maintenance Overdue: Access Denied')
    }

    const startLaserAndBlower = function () {
      LEDs.green.enable()
      setStatus(Status.ready)
      return Promise.all([startBlower(), startLaser()])
        .then(resolve)
        .catch(reject)
    }

    if (startTimers.shutdown) {
      startTimers.abortShutdown = true
    }

    if (chillerRunning) {
      debugLib('Chiller was already running, starting laser and blower immediately')
      return startLaserAndBlower()
    }

    LEDs.green.blink(300)
    setStatus(Status.starting)

    startChiller().then(function () {
      startTimers.startup = null
      if (startTimers.abortStartup) {
        debugLib('Startup aborted')
        resolve('Startup aborted')
      } else {
        chillerRunning = true
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

  if (laserWasStarted) {
    return new Promise(function (resolve, reject) {
      shutdownLaser()
        .then(function () {
          return LEDs.green.blink(300)
        })
        .then(function () {
          startTimers.shutdown = setTimeout(function () {
            startTimers.shutdown = null
            if (startTimers.abortShutdown) {
              resolve('Shutdown aborted')
            } else {
              setStatus(Status.shutdown)
              LEDs.green.disable()
              Promise.all([shutdownBlower(), shutdownChiller()])
                .then(resolve)
                .catch(reject)
            }
          }, 5 * 60 * 1000)
        })
    })
  } else {
    startTimers.abortStartup = true
    LEDs.green.disable()
    setStatus(Status.shutdown)
    return Promise.all([shutdownLaser(), shutdownBlower(), shutdownChiller()])
  }
}

let disableAccessTimer: any

export function grantAccess() {
  debugLib('Grant access request')
  authorized = true
  emitter.emit('access', 'access granted')
  if (disableAccessTimer) {
    clearTimeout(disableAccessTimer)
  }
  disableAccessTimer = setTimeout(function () {
    emitter.emit('access', 'awaiting access')
    authorized = false
    disableAccessTimer = null
  }, 20000)
}

let switchTimeout: any

(mainSwitch as any).watch(function () {
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

export { startLaser, startBlower, startChiller, shutdownLaser, shutdownBlower, shutdownChiller }

export { getStatus }
