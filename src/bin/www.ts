#!/usr/bin/env node

import debugLib from 'debug'
import { startApp, server } from '../app'

const debug = debugLib('laser:web')

startApp()

const rawPort = process.env.PORT
const port: number = rawPort ? parseInt(rawPort, 10) || 3000 : 3000

server.listen(port, () => {
  debug(`Express server listening on ${server.address()}`)
})
