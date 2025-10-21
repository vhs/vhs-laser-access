// @ts-nocheck
'use strict'

const { LaserWebApp } = require('../dist/LaserWebApp');

let mainApp;
let init = false;

const getApp = function () {
  if (!mainApp) {
    mainApp = new LaserWebApp();

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
