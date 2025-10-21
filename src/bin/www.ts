#!/usr/bin/env node

import debugLib from 'debug'
import { LaserAccessApp } from '../app'

const debug = debugLib('laser:web')

const app = new LaserAccessApp()

const rawPort = process.env.PORT
const port: number = rawPort ? parseInt(rawPort, 10) || 3000 : 3000

app.server.listen(port, () => {
  debug(`Express server listening on ${app.server.address()}`)
})
