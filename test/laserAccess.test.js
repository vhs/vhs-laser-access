"use strict";

var sinon = require("sinon");
var Promise = require("bluebird"),
    laserAccess = require("../laserAccess"),
    mockgpio = require('./mock-gpio'),
    gpios = laserAccess.gpios,
    chai = require("chai"),
    chaiAsPromised = require("chai-as-promised");

var ON = 1;
var OFF = 0;
chai.use(chaiAsPromised);
var should = chai.should();

describe("Laser startup and shutdown", function() {
    var state = mockgpio.state;
    var clock;

    before(function () {
        gpios = laserAccess.gpios;
        state[gpios.GPIO_BLOWER] = 0;
        state[gpios.GPIO_CHILLER] = 0;
        state[gpios.GPIO_LASER] = 0;
        clock = sinon.useFakeTimers();
    });

    it("turns on the main switch, only the chiller turns on", function () {
        sinon.spy(laserAccess.LEDs.green, "blink");
        laserAccess.startAll();
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        laserAccess.LEDs.green.blink.should.have.property("calledOnce", true);
        laserAccess.LEDs.green.blink.restore();
    });

    it("turns on the laser and blower after 45 seconds", function () {
        sinon.spy(laserAccess.LEDs.green, "enable");
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_BLOWER, OFF);
        laserAccess.LEDs.green.enable.should.have.property("calledOnce", false);
        clock.tick(45 * 1000);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_LASER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, ON);
        laserAccess.LEDs.green.enable.should.have.property("calledOnce", true);
        laserAccess.LEDs.green.enable.restore();
    });

    it("turns off the main switch, only the laser turns off", function () {
        laserAccess.shutdownAll();
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, ON);
    });

    it("turns off the chiller and blower after 5 minutes", function () {
        clock.tick(2 * 60 * 1000 + ON);
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, ON);
        clock.tick(3 * 60 * 1000 + ON);
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, OFF);
        state.should.have.property(gpios.GPIO_BLOWER, OFF);
    });

    it("turns on the main switch", function () {
        laserAccess.startAll();
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, OFF);
    });

    it("turns off the main switch before the laser starts", function () {
        clock.tick(30 * 1000);
        laserAccess.shutdownAll();
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, OFF);
        state.should.have.property(gpios.GPIO_BLOWER, OFF);
        clock.tick(5 * 60 * 1000 + ON);
        //Should still stay off
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, OFF);
        state.should.have.property(gpios.GPIO_BLOWER, OFF);
    });
    
    it("turns the switch on again, only laser should start", function() {
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, OFF);
        state.should.have.property(gpios.GPIO_BLOWER, OFF);
        laserAccess.startAll();
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, OFF);
    });

    it("turns the switch off after it has has started",  function() {
        clock.tick(45 * 1000);
        state.should.have.property(gpios.GPIO_LASER, ON);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, ON);
        laserAccess.shutdownAll();
        state.should.have.property(gpios.GPIO_LASER, OFF);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, ON);
    });

    it("turns the switch back on while shutting down, should start right away", function(){
        clock.tick(2 * 60 * 1000);
        laserAccess.startAll();
        state.should.have.property(gpios.GPIO_LASER, ON);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, ON);
    });

    it("should not be turned off after 5 min", function(){
        clock.tick(5 * 60 * 1000);
        state.should.have.property(gpios.GPIO_LASER, ON);
        state.should.have.property(gpios.GPIO_CHILLER, ON);
        state.should.have.property(gpios.GPIO_BLOWER, ON);
    });

});

describe("Laser switch testing", function(){
    var startAllStub, shutdownAllStub, clock;

    before("it stubs out start and shutown for the switch tests", function () {
        startAllStub = sinon.stub(laserAccess, "startAll");
        shutdownAllStub = sinon.stub(laserAccess, "shutdownAll");
        clock = sinon.useFakeTimers();
    });

    it("turns the switch on", function(){
        mockgpio.setGpio(gpios.GPIO_MAIN_SWITCH, ON);
        startAllStub.should.have.property("called", false);
        clock.tick(1000);
        startAllStub.should.have.property("called", true);
        startAllStub.reset();
    });

    it("turns the switch off", function(){
        mockgpio.setGpio(gpios.GPIO_MAIN_SWITCH, OFF);
        shutdownAllStub.should.have.property("called", false);
        clock.tick(1000);
        startAllStub.should.have.property("called", false);
        shutdownAllStub.should.have.property("called", true);
        shutdownAllStub.reset();
    });

    it("turns the switch on then off again within 500ms, only the last switch changes", function(){
        mockgpio.setGpio(gpios.GPIO_MAIN_SWITCH, ON);
        clock.tick(200);
        mockgpio.setGpio(gpios.GPIO_MAIN_SWITCH, OFF);
        startAllStub.should.have.property("called", false);
        shutdownAllStub.should.have.property("called", false);
        clock.tick(10000);
        startAllStub.should.have.property("called", false);
        shutdownAllStub.should.have.property("called", true);
    });
});

describe("Status LED tests", function(){
    var state = mockgpio.state;
    var clock;

    before(function(){
        state[gpios.GPIO_LED_GREEN] = 0;
        state[gpios.GPIO_LED_RED] = 0;
        clock = sinon.useFakeTimers();
    });

    it("turns on a green LED", function(){
        state.should.have.property(gpios.GPIO_LED_GREEN, OFF);
        return laserAccess.LEDs.green.enable()
            .then(function(){
                state.should.have.property(gpios.GPIO_LED_GREEN, ON);
            });
    });

    it("turns off the green LED", function(){
        state.should.have.property(gpios.GPIO_LED_GREEN, ON);
        return laserAccess.LEDs.green.disable()
            .then(function(){
                state.should.have.property(gpios.GPIO_LED_GREEN, OFF);
            });
    });

    it("toggles the green LED", function(){
        return laserAccess.LEDs.green.toggle()
            .then(function(){
                state.should.have.property(gpios.GPIO_LED_GREEN, ON);
                return laserAccess.LEDs.green.toggle();
            })
            .then(function(){
                state.should.have.property(gpios.GPIO_LED_GREEN, OFF);
            })
    });

    it("starts blinking the red LED", function(){
        return laserAccess.LEDs.red.blink(300).then(function(){
            state.should.have.property(gpios.GPIO_LED_RED, ON);
            clock.tick(300);
            state.should.have.property(gpios.GPIO_LED_RED, OFF);
            clock.tick(300);
            state.should.have.property(gpios.GPIO_LED_RED, ON);
        });
    });

    it("starts blinking the red LED again, should keep blinking", function(){
        clock.tick(300);
        return laserAccess.LEDs.red.blink(300).then(function(){
            state.should.have.property(gpios.GPIO_LED_RED, OFF);
            clock.tick(300);
            state.should.have.property(gpios.GPIO_LED_RED, ON);
            clock.tick(300);
            state.should.have.property(gpios.GPIO_LED_RED, OFF);
        });
    });

    it("stops blinking the red LED", function(){
        return laserAccess.LEDs.red.disable().then(function(){
            state.should.have.property(gpios.GPIO_LED_RED, OFF);
            clock.tick(300);
            state.should.have.property(gpios.GPIO_LED_RED, OFF);
        })
    });

    it("starts blinking the red LED yet again", function(){
        return laserAccess.LEDs.red.blink(300).then(function(){
            state.should.have.property(gpios.GPIO_LED_RED, ON);
            clock.tick(300);
            state.should.have.property(gpios.GPIO_LED_RED, OFF);
            clock.tick(300);
            state.should.have.property(gpios.GPIO_LED_RED, ON);
        });
    });
});