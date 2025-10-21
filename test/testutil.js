// @ts-nocheck
'use strict'

let init

const getApp = function () {
  const mainApp = require('../dist/app')
  if (!init) {
    mainApp.addHandler('/mock500', function (_req, _res, next) {
      next('Unittest error')
    })
    mainApp.addHandler('/api/mock500', function (_req, _res, next) {
      next('Unittest error')
    })
    init = true
  }
  return mainApp.startApp()
}

module.exports = {
  getApp
}
