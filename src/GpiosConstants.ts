export const gpios = {
  GPIO_LASER: 22,
  GPIO_BLOWER: 27,
  GPIO_CHILLER: 17,

  GPIO_LED_GREEN: 23,
  GPIO_LED_RED: 24,

  GPIO_MAIN_SWITCH: 4
}

export const ON = 1
export const OFF = 0

export type Gpios = typeof gpios
