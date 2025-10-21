import { ON, OFF } from './constants'

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
    return this.gpio.write(1)
  }

  disable(): Promise<any> {
    this.on = false
    if (this.blinkInterval) {
      clearInterval(this.blinkInterval)
      this.blinkInterval = null
    }
    return this.gpio.write(0)
  }

  toggle(): Promise<any> {
    this.on = !this.on
    return this.gpio.write(this.on ? 1 : 0)
  }

  blink(delay: number): Promise<any> {
    if (!this.blinkInterval) {
      this.blinkInterval = setInterval(() => {
        this.toggle()
      }, delay) as unknown as NodeJS.Timeout
      this.on = true
      return this.gpio.write(1)
    }
    return Promise.resolve()
  }
}
