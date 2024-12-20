// @ts-nocheck
'use strict'

const readline = require('readline')

const debug = require('debug')('laser:gpio')

const { gpios, ON, OFF } = require('../lib/constants')

const state = {
  watch: {}
}

function MockGpio(gpio, _mode) {
  this.gpio = gpio
}

MockGpio.prototype.write = function (value, callback) {
  state[this.gpio] = value

  this.printStats()

  callback()
}

MockGpio.prototype.read = function (_pin, callback) {
  callback(null, state[this.gpio])
}

MockGpio.prototype.readSync = function () {
  return state[this.gpio]
}

MockGpio.prototype.watch = function (callback) {
  state.watch[this.gpio] = callback
}

MockGpio.prototype.printStats = function () {
  let status = state[gpios.GPIO_LASER] === ON ? green('o') : red('o')
  status += state[gpios.GPIO_BLOWER] === ON ? green('o') : red('o')
  status += state[gpios.GPIO_CHILLER] === ON ? green('o') : red('o')

  if (status !== this.lastStatus) {
    debug(status)

    this.lastStatus = status
  }
}

function red(string) {
  return color(31, string)
}

function green(string) {
  return color(32, string)
}

function color(code, string) {
  return '\x1b[' + code + 'm' + string + '\x1b[0m'
}

module.exports.Gpio = MockGpio
module.exports.state = state

module.exports.setGpio = function (gpio, value) {
  state[gpio] = value
  state.watch[gpio](null, value)
}

if (process.argv[2] && process.argv[2] === '--gpio-in') {
  debug('Using stdin for gpio switch contro')

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  })

  rl.on('line', function (line) {
    if (line === '0') {
      state[gpios.GPIO_MAIN_SWITCH] = OFF
      state.watch[gpios.GPIO_MAIN_SWITCH]()
    } else if (line === '1') {
      state[gpios.GPIO_MAIN_SWITCH] = ON
      state.watch[gpios.GPIO_MAIN_SWITCH]()
    }
  })
}
