import readline from 'readline'
import debugLib from 'debug'
import { gpios, ON, OFF } from './GpiosConstants'

const debug = debugLib('laser:gpio')

type WatchCallback = (err?: Error | null, value?: number) => void

interface State {
  [pin: number]: number | any
  watch: { [pin: number]: WatchCallback }
}

export const state: State = {
  watch: {}
}

export class Gpio {
  gpio: number
  lastStatus?: string

  constructor(gpio: number, _mode?: string) {
    this.gpio = gpio
  }

  write(value: number): Promise<void> {
    const pin = this
    return new Promise(function (resolve) {
      state[pin.gpio] = value
      pin.printStats()
      resolve()
    })
  }

  writeSync(value: number, callback: () => void) {
    state[this.gpio] = value
    this.printStats()
    callback()
  }

  read(): Promise<number> {
    const pin = this
    return new Promise(function (resolve) {
      resolve(state[pin.gpio])
    })
  }

  readSync(): number {
    return state[this.gpio]
  }

  watch(callback: WatchCallback) {
    state.watch[this.gpio] = callback
  }

  printStats() {
    let status = (state[gpios.GPIO_LASER] === ON) ? green('o') : red('o')
    status += (state[gpios.GPIO_BLOWER] === ON) ? green('o') : red('o')
    status += (state[gpios.GPIO_CHILLER] === ON) ? green('o') : red('o')
    if (status !== this.lastStatus) {
      debug(status)
      this.lastStatus = status
    }
  }
}

function color(code: number, str: string) {
  return '\x1b[' + code + 'm' + str + '\x1b[0m'
}

function red(str: string) { return color(31, str) }
function green(str: string) { return color(32, str) }

export function setGpio(gpio: number, value: number) {
  state[gpio] = value
  const cb = state.watch[gpio]
  if (typeof cb === 'function') cb(null as any, value)
}

// Optional stdin control for manual testing
if (process.argv[2] && process.argv[2] === '--gpio-in') {
  debug('Using stdin for gpio switch control')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  })

  rl.on('line', function (line: string) {
    if (line === '0') {
      state[gpios.GPIO_MAIN_SWITCH] = OFF
      const cb = state.watch[gpios.GPIO_MAIN_SWITCH]
      if (cb) cb()
    } else if (line === '1') {
      state[gpios.GPIO_MAIN_SWITCH] = ON
      const cb = state.watch[gpios.GPIO_MAIN_SWITCH]
      if (cb) cb()
    }
  })
}
