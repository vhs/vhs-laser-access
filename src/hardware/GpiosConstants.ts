// These are the hardware pins used to control the laser via relays
// See readme for more details
// to map from GPIO to these 5xx numbers, `cat /sys/kernal/debug/gpio`
export const gpios = {
  GPIO_LASER: 534, // GPIO22
  GPIO_BLOWER: 539, // GPIO27
  GPIO_CHILLER: 529, // GPIO17

  GPIO_LED_GREEN: 535, // GPIO23
  GPIO_LED_RED: 536, // GPIO24

  GPIO_MAIN_SWITCH: 516 // GPIO04 aka GPCLK0
}

export const ON = 1
export const OFF = 0

export type Gpios = typeof gpios
