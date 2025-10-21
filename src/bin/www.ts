#!/usr/bin/env node

import debugLib from 'debug'
import appModule from '../app'

const debug = debugLib('laser:web')

const app = appModule

app.startApp()

const server = app.server

const port = process.env.PORT || 3000

server.listen(port, function () {
  // @ts-ignore
  debug('Express server listening on port ' + server.address().port)
})
