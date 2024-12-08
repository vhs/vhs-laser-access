// @ts-nocheck
'use strict'

const debug = require('debug')('laser:web')
const express = require('express')

const laser = require('../laserAccess')

const mustHaveLaserAccess = require('./auth').mustHaveLaserAccess

const router = express.Router()

router.use('/', function (_req, res, next) {
  res.result = {}
  next()
})

router.all('/activate', mustHaveLaserAccess, function (_req, res, next) {
  laser.grantAccess()
  res.result.ok = true
  next()
})

router.use('/', function (_req, res, next) {
  if (Object.keys(res.result).length > 0) {
    return res.json(res.result)
  }
  const err = new Error('Not Found')
  err.statusCode = 404
  next(err)
})

module.exports.router = router

module.exports.addErrorHandlers = function (app, path) {
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
