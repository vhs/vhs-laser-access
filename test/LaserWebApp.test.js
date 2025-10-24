'use strict'

const { expect } = require('chai')
const { LaserWebApp } = require('../dist/LaserWebApp');

describe('Core express tests', function () {
  let lwapp = new LaserWebApp();
  let app = lwapp.app;

  // route that throws a 500
  app.get('/mock500', ()=>{
    throw('Unittest error')
  })

  // route throws a 500 on the api
  app.get('/api/mock500', ()=>{
    throw('Unittest error')
  })

  lwapp.init()

  it('checks for a homepage', async function () {
    let res = await app.inject().get('/')
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
  })

  it('checks that 500s are handled on the api', async function () {
    let res = await app.inject().get('/api/mock500')
    expect(res.statusCode).to.equal(500)
  })
})
