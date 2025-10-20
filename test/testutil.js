// @ts-nocheck
'use strict'

const Bluebird = require('bluebird')
const sinon = require('sinon')

let init

module.exports.getApp = function () {
  const mainApp = require('../app')
  if (!init) {
    mainApp.addHandler('/mock500', function (_req, _res, next) {
      next('Unittest error')
    })
    mainApp.addHandler('/api/mock500', function (_req, _res, next) {
      next('Unittest error')
    })
    init = true
  }
  return mainApp.app()
}

module.exports.restoreSlackStub = function () {
  const agent = require('superagent-promise')
  agent.get.restore()
}
