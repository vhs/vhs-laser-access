import { ON, OFF } from './GpiosConstants'

export class Led {
  gpio: any
  on: boolean
  blinkInterval: NodeJS.Timeout | null

  constructor(gpio: any) {
    this.gpio = gpio
    this.on = false
    this.blinkInterval = null
  }

  enable(): Promise<any> {
    this.on = true
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval)
      this.blinkInterval = null
    }
    return this.gpio.write(ON)
  }

  disable(): Promise<any> {
    this.on = false
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval)
      this.blinkInterval = null
    }
    return this.gpio.write(OFF)
  }

  toggle(): Promise<any> {
    this.on = !this.on
    return this.gpio.write(this.on ? ON : OFF)
  }

  blink(delay: number): Promise<any> {
    if (!this.blinkInterval) {
      this.blinkInterval = setInterval(() => {
        this.toggle()
      }, delay)
      this.on = true
      return this.gpio.write(ON)
    }
    return Promise.resolve()
  }
}
