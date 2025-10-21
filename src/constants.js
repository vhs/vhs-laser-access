'use strict'

const gpios = {
  GPIO_LASER: 22,
  GPIO_BLOWER: 27,
  GPIO_CHILLER: 17,

  GPIO_LED_GREEN: 23,
  GPIO_LED_RED: 24,

  GPIO_MAIN_SWITCH: 4
}

module.exports.gpios = gpios

const ON = 1
const OFF = 0

module.exports.ON = ON
module.exports.OFF = OFF
