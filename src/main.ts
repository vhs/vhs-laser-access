#!/usr/bin/env node

import debugLib from 'debug'
import { LaserWebApp } from './LaserWebApp'
import { config } from './Configuration'

const debug = debugLib('laser:web')

// create the main express webapp
const app = new LaserWebApp()
app.init();

// load port number from config
const port: number = config.port || 3000

// start the server listening
app.server.listen(port, () => {
  debug(`Express server listening on ${app.server.address()}`)
})
