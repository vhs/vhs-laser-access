// @ts-nocheck
'use strict'

const Bluebird = require('bluebird')

function Led(gpio) {
  Bluebird.promisifyAll(gpio)
  this.gpio = gpio
  this.on = false
  this.blinkInterval = false
}

Led.prototype.enable = function () {
  this.on = true
  if (this.blinkInterval) {
    clearInterval(this.blinkInterval)
    this.blinkInterval = null
  }
  return this.gpio.writeAsync(1)
}

Led.prototype.disable = function () {
  this.on = false
  if (this.blinkInterval) {
    clearInterval(this.blinkInterval)
    this.blinkInterval = null
  }
  return this.gpio.writeAsync(0)
}

Led.prototype.toggle = function () {
  this.on = !this.on
  return this.gpio.writeAsync(this.on ? 1 : 0)
}

Led.prototype.blink = function (delay) {
  const Led = this
  if (!this.blinkInterval) {
    this.blinkInterval = setInterval(function () {
      Led.toggle()
    }, delay)
    this.on = true
    return this.gpio.writeAsync(1)
  }
  return Bluebird.resolve()
}

module.exports.Led = Led
