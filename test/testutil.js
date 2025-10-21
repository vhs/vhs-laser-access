// @ts-nocheck
'use strict'

const { LaserAccessApp } = require('../dist/app')

let mainApp;
let init = false;

const getApp = function () {
  if (!mainApp) {
    mainApp = new LaserAccessApp();

    mainApp.expressApp.use('/mock500', function (_req, _res, next) {
      next('Unittest error')
    })

    mainApp.expressApp.use('/api/mock500', function (_req, _res, next) {
      next('Unittest error')
    })

    mainApp.init()
  }
  return mainApp.expressApp
}

module.exports = {
  getApp
}
