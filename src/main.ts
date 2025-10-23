#!/usr/bin/env node

import debugLib from 'debug'
import { LaserWebApp } from './LaserWebApp'
import { config } from './Configuration'

const debug = debugLib('laser:web')

async function start() {
  try {
    // create the main fastify webapp
    const app = new LaserWebApp()
    await app.init()

    // load port number from config
    const port: number = config.port || 3000

    // Start the server and initialize socket.io
    await app.app.listen({ port, host: '0.0.0.0'})

    debug(`Fastify server listening on port ${port}`)
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
