#!/usr/bin/env node

import debugLib from 'debug'
import { LaserWebApp } from './LaserWebApp'
import { config } from './Configuration'

const debug = debugLib('laser:web')

async function start() {
  try {
    // create the main fastify webapp
    const app = new LaserWebApp()
    await app.setup()
    app.setupErrors()

    // load port number from config
    const port: number = config.port || 3000

    // Start the server and initialize socket.io
    // a hostname is required here to make sure socket.io works correctly
    await app.app.listen({ port, host: '0.0.0.0'})

    debug(`Fastify server listening on port ${port}`)
  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

start()
