"use strict";

var Gpio;
try {
    Gpio = require('onoff').Gpio;
} catch(err){
    Gpio = require('./test/mock-gpio').Gpio;
}

var gpios = {
    GPIO_LASER: 22,
    GPIO_BLOWER: 27,
    GPIO_CHILLER: 17,

    GPIO_LED_GREEN: 23,
    GPIO_LED_RED: 24,

    GPIO_MAIN_SWITCH: 4
};

module.exports.gpios = gpios;

var Promise = require('bluebird'),
    Led = require('./led').Led,
    laser = new Gpio(gpios.GPIO_LASER, 'out'),
    blower = new Gpio(gpios.GPIO_BLOWER, 'out'),
    chiller = new Gpio(gpios.GPIO_CHILLER, 'out'),
    debug = require('debug')('laser:control'),
    EventEmitter = require('events').EventEmitter,
    emitter = new EventEmitter(),
    mainSwitch = new Gpio(gpios.GPIO_MAIN_SWITCH, 'in', 'both');

var t = require('debug')('trace');

var LEDs = {
    green: new Led(new Gpio(gpios.GPIO_LED_GREEN, 'out')),
    red: new Led(new Gpio(gpios.GPIO_LED_RED, 'out'))
};

LEDs.red.enable();

module.exports.LEDs = LEDs;

Promise.promisifyAll(laser);
Promise.promisifyAll(blower);
Promise.promisifyAll(chiller);
Promise.promisifyAll(mainSwitch);

var startTimers = {};
var laserWasStarted = false;
var chillerRunning = false;
var authorized = false;
var status = "shutdown";

function startLaser(){
    debug("Laser started");
    laserWasStarted = true;
    emitter.emit("laser", "laserStarted");
    laser.online = true;
    return laser.writeAsync(1);
}

function shutdownLaser(){
    debug("Laser shutdown");
    laserWasStarted = false;
    emitter.emit("laser", "laserShutdown");
    laser.online = false;
    return laser.writeAsync(0);
}

function startBlower(){
    debug("Blower started");
    emitter.emit("laser", "blowerStarted");
    blower.online = true;
    return blower.writeAsync(1);
}

function shutdownBlower(){
    debug("Blower shutdown");
    emitter.emit("laser", "blowerShutdown");
    blower.online = false;
    return blower.writeAsync(0);
}

function startChiller(){
    debug("Chiller started");
    emitter.emit("laser", "chillerStarted");
    chiller.online = true;
    return chiller.writeAsync(1);
}

function shutdownChiller(){
    debug("Chiller shutdown");
    chillerRunning = false;
    emitter.emit("laser", "chillerShutdown");
    chiller.online = false;
    return chiller.writeAsync(0);
}

function mainSwitchOn(){
    return mainSwitch.readSync() == 1;
}

function setStatus(s){
    status = s;
    emitter.emit("status", s);
}

function getStatus(){
    return status;
}

module.exports.startAll = function(){
    startTimers.abortStartup = false;
    return new Promise(function(resolve, reject){
        if (!authorized) {
            LEDs.red.blink(150);
            setTimeout(function(){
                LEDs.red.enable();
            }, 2000);
            return reject("Access Denied");
        }
        var startLaserAndBlower = function(){
            LEDs.green.enable();
            setStatus("ready");

            return Promise.all([startLaser(), startBlower()])
                .then(resolve)
                .catch(reject);
        };

        if (startTimers.shutdown) {
            //Tell the shutdown timers to abort.
            startTimers.abortShutdown = true;
        }

        if (chillerRunning) {
            //Start right away, chiller has already been running.
            debug("Chiller was already running, start right away");
            return startLaserAndBlower();
        }
        LEDs.green.blink(300);
        setStatus("starting");
        startChiller().
            then(function(){
                startTimers.startup = setTimeout(function(){
                    startTimers.startup = null;
                    if (startTimers.abortStartup) {
                        debug("Startup aborted");
                        resolve("Startup aborted");
                    } else {
                        chillerRunning = true;
                        startLaserAndBlower();
                    }
                }, 45 * 1000);
            });
    });
};

module.exports.shutdownAll = function(){
    if (startTimers.shutdown && !startTimers.abortShutdown){
        debug("Shutdown requested but it's already in progress");
        return;
    }
    startTimers.abortShutdown = false;
    setStatus("shutting down");
    if (laserWasStarted) {
        //Shutdown after a delay
        return new Promise(function (resolve, reject) {
            shutdownLaser()
                .then(function () {
                    setStatus("shutdown");
                    return LEDs.green.blink(300);
                })
                .then(function(){
                    startTimers.shutdown = setTimeout(function () {
                        startTimers.shutdown = null;
                        if (startTimers.abortShutdown){
                            resolve("Shutdown aborted");
                        } else {
                            setStatus("shutdown");
                            LEDs.green.disable();
                            Promise.all([shutdownBlower(), shutdownChiller()])
                                .then(resolve)
                                .catch(reject);
                        }
                    }, 5 * 60 * 1000);
                });
        });
    } else {
        //Shutdown right away, cancel any timers
        startTimers.abortStartup = true;
        setStatus("shutdown");
        return Promise.all([
            shutdownLaser(),
            shutdownBlower(),
            shutdownChiller()
        ]);
    }
};

var disableAccessTimer;

module.exports.grantAccess = function(){
    debug("Grant access request");
    authorized = true;
    emitter.emit("access", "access granted");
    if (disableAccessTimer){
        clearTimeout(disableAccessTimer);
    }
    disableAccessTimer = setTimeout(function(){
        emitter.emit("access", "awaiting access");
        authorized = false;
        disableAccessTimer = null;
    }, 10000);
};

var switchTimeout;

mainSwitch.watch(function(){
    clearTimeout(switchTimeout);
    switchTimeout = setTimeout(function(){
        //re-read the value
        if (mainSwitchOn()){
            return module.exports.startAll();
        } else {
            return module.exports.shutdownAll();
        }
    }, 500);
});

module.exports.on = function(event, listener) {
    return emitter.on(event, listener);
};

module.exports.getStatus = getStatus;