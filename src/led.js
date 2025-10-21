// @ts-nocheck
'use strict'

const { ON, OFF } = require('constants');

function Led(gpio) {
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
  return this.gpio.write(1)
}

Led.prototype.disable = function () {
  this.on = false
  if (this.blinkInterval) {
    clearInterval(this.blinkInterval)
    this.blinkInterval = null
  }
  return this.gpio.write(0)
}

Led.prototype.toggle = function () {
  this.on = !this.on
  return this.gpio.write(this.on ? 1 : 0)
}

Led.prototype.blink = function (delay) {
  const Led = this
  if (!this.blinkInterval) {
    this.blinkInterval = setInterval(function () {
      Led.toggle()
    }, delay)
    this.on = true
    return this.gpio.write(1)
  }
  return Promise.resolve()
}

module.exports.Led = Led
