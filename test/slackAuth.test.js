// @ts-nocheck
'use strict'

const sinon = require('sinon')
const request = require('supertest')

const config = require('../config')
const laser = require('../laserAccess')

const testutil = require('./testutil')

const app = testutil.getApp()

describe('Core express tests', function () {
  let oauthHandler, authdAgent

  before('it has to stub passport', function () {
    const auth = require('../routes/auth')
    const slack = auth.passport._strategies.slack
    sinon.stub(
      slack._oauth2,
      'getOAuthAccessToken',
      function (code, params, callback) {
        return oauthHandler(code, params, callback)
      }
    )
    sinon.stub(slack, 'userProfile', function (_token, callback) {
      callback(null, {
        id: 'MEMBER_ID_2',
        provider: 'mock_slack',
        displayName: 'Mock Display'
      })
    })
    config.slack.adminGroup = 'GROUP_ID_2'
    sinon.stub(laser, 'grantAccess', function () {})
    testutil.stubSlack()
  })

  after(function () {
    laser.grantAccess.restore()
    testutil.restoreSlackStub()
  })

  it('tries an authenticated page that should not be allowed', function () {
    return request(app).post('/api/activate').expect(401)
  })

  it('requests auth access for slack', function () {
    return request(app)
      .get('/auth/slack')
      .expect(302)
      .then(function (res) {
        res.header.should.have
          .property('location')
          .to.contain('https://slack.com/oauth/authorize')
      })
  })

  it('tries a callback from slack', function () {
    oauthHandler = function (code, _params, callback) {
      code.should.equal('mock_code')
      callback(null, 'token', 'refresh', {})
    }
    authdAgent = request.agent(app)
    return authdAgent
      .get('/auth/slack/callback')
      .query({
        code: 'mock_code'
      })
      .expect(302)
      .then(function (res) {
        res.header.should.have.property('location', '/')
      })
  })

  it('now tries an authenticated page', function () {
    return authdAgent.post('/api/activate').expect(200)
  })
})
