// @ts-nocheck
'use strict'

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

module.exports.stubSlack = function () {
  const agent = require('superagent-promise')
  sinon.stub(agent, 'get', function (_url) {
    return {
      query: function () {
        return this
      },
      end: function () {
        return Promise.resolve({
          body: require('./data/slack_list_groups.json')
        })
      }
    }
  })
}

module.exports.restoreSlackStub = function () {
  const agent = require('superagent-promise')
  agent.get.restore()
}
