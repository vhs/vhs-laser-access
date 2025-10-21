// @ts-nocheck
'use strict'

const debug = require('debug')('laser:web')
const laser = require('../laserAccess')
const sio = require('../socket')

const router = require('express').Router()

function laserStatus(_req, res, next) {
  res.locals.status = laser.status
  next()
}

/* Placeholder homepage */
router.get('/', laserStatus, function (_req, res, _next) {
  res.render('index', { title: 'VHS' })
})

router.all('/api/activate', function (_req, res, next) {
  laser.grantAccess()
  res.result.ok = true
  next()
})

function apiErrorHandler (app, path) {
  app.use(path, function (err, _req, res, _next) {
    // jshint ignore:line
    const response = {
      msg: err.message,
      type: err.type,
      status: err.statusCode || 500
    }
    if (response.status === 500) {
      debug(err)
    }
    res.status(err.statusCode || 500)
    return res.json(response)
  })
}

const addMiddleware = function (app) {
  sio.io.on('connection', function (socket) {
    socket.emit('status', laser.getStatus())
  })
}

const addErrorHandlers = function (app) {
  apiErrorHandler(app, '/api')
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

module.exports = {
  router,
  addErrorHandlers,
  addMiddleware
}
