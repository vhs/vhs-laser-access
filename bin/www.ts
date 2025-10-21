#!/usr/bin/env node

import debugLib from 'debug'
import { startApp, server } from '../src/app'

const debug = debugLib('laser:web')

startApp()

server.listen(process.env.PORT || 3000, function () {
  // @ts-ignore
  debug('Express server listening on port ' + server.address().port)
})
