"use strict";

var Gpio;
try {
    Gpio = require('onoff').Gpio;
} catch(err){
    Gpio = require('./test/mock-gpio').Gpio;
}

var gpios = {
    GPIO_LASER: 23,
    GPIO_BLOWER: 24,
    GPIO_CHILLER: 25,

    GPIO_LED_GREEN: 27,
    GPIO_LED_RED: 22,

    GPIO_MAIN_SWITCH: 4
};

module.exports.gpios = gpios;

var Promise = require('bluebird'),
    Led = require('./led').Led,
    laser = new Gpio(gpios.GPIO_LASER, 'out'),
    blower = new Gpio(gpios.GPIO_BLOWER, 'out'),
    chiller = new Gpio(gpios.GPIO_CHILLER, 'out'),
    debug = require('debug')('laser'),
    mainSwitch = new Gpio(gpios.GPIO_MAIN_SWITCH, 'in', 'both');

var LEDs = {
    green: new Led(new Gpio(gpios.GPIO_LED_GREEN, 'out')),
    red: new Led(new Gpio(gpios.GPIO_LED_RED, 'out'))
};

module.exports.LEDs = LEDs;

Promise.promisifyAll(laser);
Promise.promisifyAll(blower);
Promise.promisifyAll(chiller);
Promise.promisifyAll(mainSwitch);

var startTimers = {};
var laserWasStarted = false;
var chillerRunning = false;

function startLaser(){
    debug("Laser started");
    laserWasStarted = true;
    return laser.writeAsync(1);
}

function shutdownLaser(){
    debug("Laser shutdown");
    laserWasStarted = false;
    return laser.writeAsync(0);
}

function startBlower(){
    debug("Blower started");
    return blower.writeAsync(1);
}

function shutdownBlower(){
    debug("Blower shutdown");
    return blower.writeAsync(0);
}

function startChiller(){
    debug("Chiller started");
    return chiller.writeAsync(1);
}

function shutdownChiller(){
    debug("Chiller shutdown");
    chillerRunning = false;
    return chiller.writeAsync(0);
}

function mainSwitchOn(){
    return mainSwitch.readSync() == 1;
}

module.exports.startAll = function(){
    startTimers.abortStartup = false;
    return new Promise(function(resolve, reject){
        var startLaserAndBlower = function(){
            LEDs.green.enable();
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
    startTimers.abortShutdown = false;
    if (laserWasStarted) {
        //Shutdown after a delay
        return new Promise(function (resolve, reject) {
            shutdownLaser()
                .then(function () {
                    return LEDs.green.blink(300);
                })
                .then(function(){
                    startTimers.shutdown = setTimeout(function () {
                        startTimers.shutdown = null;
                        if (startTimers.abortShutdown){
                            resolve("Shutdown aborted");
                        } else {
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
        return Promise.all([
            shutdownLaser(),
            shutdownBlower(),
            shutdownChiller()
        ]);
    }
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
