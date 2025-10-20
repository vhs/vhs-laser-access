// @ts-nocheck
'use strict'

const debug = require('debug')('laser:web')
const express = require('express')

const laser = require('../laserAccess')
const sio = require('../socket')

const api = require('./api')

const router = express.Router()

function laserStatus(_req, res, next) {
  res.locals.status = laser.status
  next()
}

router.use('/', function (req, res, next) {
  next()
})

/* Placeholder homepage */
router.get('/', laserStatus, function (_req, res, _next) {
  res.render('index', { title: 'VHS' })
})

router.use('/api', api.router)

module.exports.router = router

module.exports.addMiddleware = function (app) {
  sio.io.on('connection', function (socket) {
    socket.emit('status', laser.getStatus())
  })
}

module.exports.addErrorHandlers = function (app) {
  api.addErrorHandlers(app, '/api')
}

laser.on('laser', function (event) {
  debug('New event from laser ' + event.id)
  sio.io.emit('laser', event)
})

laser.on('access', function (event) {
  debug('New event from access ' + event.id)
  sio.io.emit('access', event)
})

laser.on('status', function (event) {
  debug('New event from status ' + event.id)
  sio.io.emit('status', event)
})
