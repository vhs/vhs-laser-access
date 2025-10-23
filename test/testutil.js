// @ts-nocheck
'use strict'

const { LaserWebApp } = require('../dist/LaserWebApp');

let mainApp;
let init = false;

const getApp = function () {
  if (!mainApp) {
    mainApp = new LaserWebApp();

    mainApp.app.get('/mock500', ()=>{
      throw('Unittest error')
    })

    mainApp.app.get('/api/mock500', ()=>{
      throw('Unittest error')
    })

    mainApp.init()
  }
  return mainApp.app
}

module.exports = {
  getApp
}
