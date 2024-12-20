// @ts-nocheck
'use strict'

const debug = require('debug')('laser:nomos')
const agent = require('superagent-promise')
const _ = require('underscore')

const config = require('../config.json')

module.exports.checkAuth = function (service, id) {
  return agent('POST', config.nomosUrl)
    .send({ service, id })
    .set('X-Api-Key', config.nomosApiKey)
    .end()
    .then(function (res) {
      return JSON.parse(res.text)
    })
    .catch(function (err) {
      //Log this for now and proceed to the next promise
      console.error(err)
      return { valid: false, error: true }
    })
    .then(function (user) {
      debug(user)
      let haslaser = false
      if (user?.valid && user.privileges) {
        _.each(user.privileges, function (priv) {
          if (priv.code === 'laser') {
            haslaser = true
          }
        })
      }
      return haslaser
    })
}