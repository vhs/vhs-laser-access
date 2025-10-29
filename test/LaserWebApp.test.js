'use strict'

const { expect } = require('chai')
const { LaserWebApp } = require('../dist/LaserWebApp');

describe('Core web app tests', async function () {
  // setup app
  let lwapp = await new LaserWebApp().setup();
  let app = lwapp.app;

  // route that throws a 500
  app.get('/mock500', () => {
    throw ('Unittest error')
  })
  // route throws a 500 on the api
  app.get('/api/mock500', () => {
    throw ('Unittest error')
  })

  // must be done AFTER adding the mock500 routes, for some reason
  lwapp.setupErrors();

  it('checks for a homepage', async function () {
    let res = await app.inject().get('/') // fails because missing jwt
    expect(res.statusCode).to.equal(200)
  })

  it('checks that errors are handled', async function () {
    let res = await app.inject().get('/mock500')
    expect(res.statusCode).to.equal(500)
  })

  it('checks that 404s are handled', async function () {
    let res = await app.inject().get('/mock404')
    expect(res.statusCode).to.equal(404)
  })

  it('checks that 404s are handled on the api', async function () {
    let res = await app.inject().get('/api/mock404')
    expect(res.statusCode).to.equal(404)
    // expect the body to have the error json
    let error = await res.json();

    expect(error.message).to.exist
    expect(error.error).to.exist
  })

  it('checks that 500s are handled on the api', async function () {
    let res = await app.inject().get('/api/mock500')
    expect(res.statusCode).to.equal(500)
    let error = await res.json();

    expect(error.message).to.exist
    expect(error.error).to.exist
  })

  // this messes up downstream tests, so commenting out for now
  // it('api responds to activate', async function () {
  //   let res = await app.inject().get('/api/activate')
  //   expect(res.statusCode).to.equal(200)
  //   let data = await res.json();
  //   expect(data.ok).to.equal(true)
  // })
})
