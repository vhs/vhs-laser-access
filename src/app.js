// @ts-nocheck
'use strict'

const http = require('http')
const path = require('path')
const debug = require('debug')('laser:web')
const express = require('express')
const routes = require('./routes')

const app = express()

const server = new http.Server(app)

require('./socket').init(server)

let init = false

// view engine setup
app.set('views', path.join(__dirname, '..', 'views'))
app.set('view engine', 'jade')

module.exports.addHandler = function (path, handler) {
  app.use(path, handler)
}

module.exports.app = function () {
  if (!init) {
    routes.addMiddleware(app)
    
    app.use('/', routes.router)

    routes.addErrorHandlers(app)

    app.use(express.static(path.join(__dirname, '..', 'public')))

    // catch 404 and forward to error handler
    app.use(function (_req, _res, next) {
      const err = new Error('Not Found')
      err.status = 404
      next(err)
    })

    // production error handler
    app.use(function (err, _req, res, _next) {
      debug(err)
      res.status(err.status || 500)
      res.render('error', {
        message: err.message || err,
        error: {}
      })
    })
    init = true
  }

  return app
}

module.exports.server = server
