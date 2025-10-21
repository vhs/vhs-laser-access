// @ts-nocheck
'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const sinon = require('sinon')

const { manager } = require('../dist/hardware/LaserAccessManager')
const mockgpio = require('../dist/hardware/MockGpio')
const { gpios, ON, OFF } = require("../dist/hardware/GpiosConstants");

chai.use(chaiAsPromised);
chai.should();

describe('Laser startup and shutdown', function () {
  const state = mockgpio.state
  let clock

  before(function () {
    state[gpios.GPIO_BLOWER] = OFF
    state[gpios.GPIO_CHILLER] = OFF
    state[gpios.GPIO_LASER] = OFF
    clock = sinon.useFakeTimers()
  })

  after(function () {
    clock.restore()
  })

  it("won't let you start the laser when the chiller is not running", function () {
    return manager.startLaser().should.be.rejected
  })

  it("won't let you start the laser when the chiller is not running", function () {
    return manager.startChiller().then(function () {
      return manager.startLaser().should.be.rejected
    })
  })

  it('will now let you start the laser when the blower is running', function () {
    return manager.startBlower().then(function () {
      return manager.startLaser().should.be.fulfilled
    })
  })

  it('will never let you shutdown the blower if the laser is running', function () {
    return manager.shutdownBlower().should.be.rejected
  })

  it('will never let you shutdown the chiller if the laser is running', function () {
    return manager.shutdownChiller().should.be.rejected
  })

  it('will now shutdown the laser', function () {
    return manager.shutdownLaser().should.be.fulfilled
  })

  it('will now shutdown the blower', function () {
    return manager.shutdownBlower().should.be.fulfilled
  })

  it('will now shutdown the chiller', function () {
    return manager.shutdownChiller().should.be.fulfilled
  })

  it('resets the state', function () {
    state[gpios.GPIO_BLOWER] = OFF
    state[gpios.GPIO_CHILLER] = OFF
    state[gpios.GPIO_LASER] = OFF
  })

  it('turns on the main switch but access has not been granted yet', function () {
    const promise = manager.startAll().should.eventually.be.rejected
    clock.tick(45 * 1000)
    return promise
  })

  it('grants access to the laser', function () {
    manager.grantAccess()

    //Grant again, should replace the existing timer;
    manager.grantAccess()
  })

  it('turns on the main switch, only the chiller turns on', function () {
    sinon.spy(manager.LEDs.green, 'blink')
    manager.startAll()
    manager.getStatus().should.have.property('id', 'starting')
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    manager.LEDs.green.blink.should.have.property('calledOnce', true)
    manager.LEDs.green.blink.restore()
  })

  // it('turns on the laser and blower after 45 seconds', function () {
  //   // need for this test was eliminated here: https://github.com/vhs/vhs-laser-access/commit/11ae1cd31cdcf21dda93ddc0e1575825e9a73d9a
  //   sinon.spy(laserAccess.LEDs.green, 'enable')
  //   state.should.have.property(gpios.GPIO_LASER, OFF)
  //   state.should.have.property(gpios.GPIO_BLOWER, OFF)
  //   laserAccess.LEDs.green.enable.should.have.property('calledOnce', false)
  //   clock.tick(45 * 1000)
  //   state.should.have.property(gpios.GPIO_CHILLER, ON)
  //   state.should.have.property(gpios.GPIO_LASER, ON)
  //   state.should.have.property(gpios.GPIO_BLOWER, ON)
  //   laserAccess.getStatus().should.have.property('id', 'ready')
  //   laserAccess.LEDs.green.enable.should.have.property('calledOnce', true)
  //   laserAccess.LEDs.green.enable.restore()
  // })

  it('turns off the main switch, only the laser turns off', function () {
    manager.shutdownAll()
    manager.getStatus().should.have.property('id', 'shuttingDown')
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, ON)
  })

  it('turns off the chiller and blower after 5 minutes', function () {
    clock.tick(2 * 60 * 1000 + ON)
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, ON)
    clock.tick(3 * 60 * 1000 + ON)
    manager.getStatus().should.have.property('id', 'shutdown')
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, OFF)
    state.should.have.property(gpios.GPIO_BLOWER, OFF)
  })

  it('turns on the main switch', function () {
    manager.grantAccess()
    manager.startAll()
    manager.getStatus().should.have.property('id', 'starting')
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, OFF)
  })

  it('turns off the main switch before the laser starts', function () {
    clock.tick(30 * 1000)
    manager.shutdownAll()
    manager.getStatus().should.have.property('id', 'shutdown')
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, OFF)
    state.should.have.property(gpios.GPIO_BLOWER, OFF)
    clock.tick(5 * 60 * 1000 + ON)
    //Should still stay off
    manager.getStatus().should.have.property('id', 'shutdown')
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, OFF)
    state.should.have.property(gpios.GPIO_BLOWER, OFF)
  })

  it('turns the switch on again, only laser should start', function () {
    manager.grantAccess()
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, OFF)
    state.should.have.property(gpios.GPIO_BLOWER, OFF)
    manager.startAll()
    manager.getStatus().should.have.property('id', 'starting')
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, OFF)
  })

  it('turns the switch off after it has has started', function () {
    clock.tick(45 * 1000)
    state.should.have.property(gpios.GPIO_LASER, ON)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, ON)
    manager.getStatus().should.have.property('id', 'ready')
    manager.shutdownAll()
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, ON)
    manager.getStatus().should.have.property('id', 'shuttingDown')
  })

  it('turns the switch back on while shutting down, should start right away', function () {
    clock.tick(2 * 60 * 1000)
    manager.grantAccess()
    manager.startAll()
    state.should.have.property(gpios.GPIO_LASER, ON)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, ON)
    manager.getStatus().should.have.property('id', 'ready')
  })

  it('should not be turned off after 5 min', function () {
    clock.tick(5 * 60 * 1000)
    manager.getStatus().should.have.property('id', 'ready')
    state.should.have.property(gpios.GPIO_LASER, ON)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, ON)
  })

  it('shuts down but tries to toggle the switch when there is no access', function () {
    manager.shutdownAll()
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, ON)
  })

  it('tries to start without success then shutsdown', function () {
    clock.tick(2 * 60 * 1000)
    manager.startAll().should.eventually.be.rejected //Note this should not change anything, no access granted
    manager.shutdownAll()
    clock.tick(30 * 1000)
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, ON)
    state.should.have.property(gpios.GPIO_BLOWER, ON)
    clock.tick(5 * 60 * 1000)
    state.should.have.property(gpios.GPIO_LASER, OFF)
    state.should.have.property(gpios.GPIO_CHILLER, OFF)
    state.should.have.property(gpios.GPIO_BLOWER, OFF)
  })
})

describe('Laser switch testing', function () {
  let startAllStub, shutdownAllStub, clock

  before('it stubs out start and shutown for the switch tests', function () {
    startAllStub = sinon.stub(manager, 'startAll')
    shutdownAllStub = sinon.stub(manager, 'shutdownAll')
    clock = sinon.useFakeTimers()
  })

  after(function () {
    clock.restore()
  })

  it('turns the switch on', function () {
    mockgpio.setGpio(gpios.GPIO_MAIN_SWITCH, ON)
    startAllStub.should.have.property('called', false)
    clock.tick(1000)
    startAllStub.should.have.property('called', true)
    startAllStub.reset()
  })

  it('turns the switch off', function () {
    mockgpio.setGpio(gpios.GPIO_MAIN_SWITCH, OFF)
    shutdownAllStub.should.have.property('called', false)
    clock.tick(1000)
    startAllStub.should.have.property('called', false)
    shutdownAllStub.should.have.property('called', true)
    shutdownAllStub.reset()
  })

  it('turns the switch on then off again within 500ms, only the last switch changes', function () {
    mockgpio.setGpio(gpios.GPIO_MAIN_SWITCH, ON)
    clock.tick(200)
    mockgpio.setGpio(gpios.GPIO_MAIN_SWITCH, OFF)
    startAllStub.should.have.property('called', false)
    shutdownAllStub.should.have.property('called', false)
    clock.tick(10000)
    startAllStub.should.have.property('called', false)
    shutdownAllStub.should.have.property('called', true)
  })
})

describe('Status LED tests', function () {
  const state = mockgpio.state
  let clock

  before(function () {
    state[gpios.GPIO_LED_GREEN] = OFF
    state[gpios.GPIO_LED_RED] = OFF
    clock = sinon.useFakeTimers()
  })

  after(function () {
    clock.restore()
  })

  it('turns on a green LED', function () {
    state.should.have.property(gpios.GPIO_LED_GREEN, OFF)
    return manager.LEDs.green.enable().then(function () {
      state.should.have.property(gpios.GPIO_LED_GREEN, ON)
    })
  })

  it('turns off the green LED', function () {
    state.should.have.property(gpios.GPIO_LED_GREEN, ON)
    return manager.LEDs.green.disable().then(function () {
      state.should.have.property(gpios.GPIO_LED_GREEN, OFF)
    })
  })

  it('toggles the green LED', function () {
    return manager.LEDs.green
      .toggle()
      .then(function () {
        state.should.have.property(gpios.GPIO_LED_GREEN, ON)
        return manager.LEDs.green.toggle()
      })
      .then(function () {
        state.should.have.property(gpios.GPIO_LED_GREEN, OFF)
      })
  })

  it('starts blinking the red LED', function () {
    return manager.LEDs.red.blink(300).then(function () {
      state.should.have.property(gpios.GPIO_LED_RED, ON)
      clock.tick(300)
      state.should.have.property(gpios.GPIO_LED_RED, OFF)
      clock.tick(300)
      state.should.have.property(gpios.GPIO_LED_RED, ON)
    })
  })

  it('starts blinking the red LED again, should keep blinking', function () {
    clock.tick(300)
    return manager.LEDs.red.blink(300).then(function () {
      state.should.have.property(gpios.GPIO_LED_RED, OFF)
      clock.tick(300)
      state.should.have.property(gpios.GPIO_LED_RED, ON)
      clock.tick(300)
      state.should.have.property(gpios.GPIO_LED_RED, OFF)
    })
  })

  it('stops blinking the red LED', function () {
    return manager.LEDs.red.disable().then(function () {
      state.should.have.property(gpios.GPIO_LED_RED, OFF)
      clock.tick(300)
      state.should.have.property(gpios.GPIO_LED_RED, OFF)
    })
  })

  it('starts blinking the red LED yet again', function () {
    return manager.LEDs.red.blink(300).then(function () {
      state.should.have.property(gpios.GPIO_LED_RED, ON)
      clock.tick(300)
      state.should.have.property(gpios.GPIO_LED_RED, OFF)
      clock.tick(300)
      state.should.have.property(gpios.GPIO_LED_RED, ON)
    })
  })
})
