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
    mainSwitch = new Gpio(gpios.GPIO_MAIN_SWITCH, 'in', 'both'),
    rp = require('request-promise'),
    CryptoJS = require("crypto-js");

var config = require('./config');

// MQTT setup

var mqtt = require('mqtt');

var mqttClient = mqtt.connect(mqtt://10.100.100.1); // VHS Public Facing MQTT. Should eventually be changed to a private mqtt instance.

var mqttTopic = 'laser/maintenance';

var maintenanceStatus = 'ok'; // Default status is 'ok'



mqttClient.on('connect', function () {

    debug('Connected to MQTT broker');

    mqttClient.subscribe(mqttTopic, function (err) {

        if (err) {

            debug('Failed to subscribe to topic: ' + mqttTopic);

        } else {

            debug('Subscribed to MQTT topic: ' + mqttTopic);

        }

    });

});



mqttClient.on('message', function (topic, message) {

    if (topic === mqttTopic) {

        maintenanceStatus = message.toString(); // Read the message and store it

        debug('Received message on ' + mqttTopic + ': ' + maintenanceStatus);

    }

});

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
var status = { id: "shutdown", name: "Shutdown" };

function sendAPILaserUpdate( status ) {
	var ts = Math.floor(Date.now()/1000);
	var requestURI = "/s/vhs/data/laser/update";
	
	var formdata = {};
	formdata.value = status;
	formdata.ts =  ""+ts;
	formdata.client = config.api.clientName;
	
	var key = ts + JSON.stringify( formdata ) + config.api.clientSecret;
	
	var hash = CryptoJS.HmacSHA256( JSON.stringify( formdata ), key );
	
	var signedRequestUrl = config.api.baseUrl + requestURI + "?hash=" + hash;
	
	return rp.put({
		url : signedRequestUrl,
		json: true,
		form: formdata
	});
}

function startLaser(){
    if (!chiller.online){
        return Promise.reject("Chiller is not running");
    }
    if (!blower.online){
        return Promise.reject("Blower is not running");
    }

    debug("Laser started");
    laserWasStarted = true;
    emitter.emit("laser", { id: "laserStarted", name: "Laser Started"});
    laser.online = true;
    sendAPILaserUpdate( "on" ).then( function(response) {
	  debug( 'updated api - startup' );
	}).catch( function( err ) {
		debug( 'error updating api - startup' );
	});
    return laser.writeAsync(1);
}

function shutdownLaser(){
    debug("Laser shutdown");
    sendAPILaserUpdate( "off" ).then( function(response) {
  	  debug( 'updated api - shutdown' );
  	}).catch( function( err ) {
  		debug( 'error updating api - shutdown' );
  	});
    laserWasStarted = false;
    emitter.emit("laser", { id: "laserShutdown", name: "Laser Shutdown"});
    laser.online = false;
    return laser.writeAsync(0);
}

function startBlower(){
    debug("Blower started");
    emitter.emit("laser", { id: "blowerStarted", name: "Blower Started"});
    blower.online = true;
    return blower.writeAsync(1);
}

function shutdownBlower(){
    if (laser.online){
        return Promise.reject("Laser is running, will not shutdown blower");
    }
    debug("Blower shutdown");
    emitter.emit("laser", { id: "blowerShutdown", name: "Blower Shutdown"});
    blower.online = false;
    return blower.writeAsync(0);
}

function startChiller(){
    debug("Chiller started");
    emitter.emit("laser", { id: "chillerStarted", name: "Chiller/Compressor Started" });
    chiller.online = true;
    return chiller.writeAsync(1);
}

function shutdownChiller(){
    if (laser.online){
        return Promise.reject("Laser is running, will not shutdown chiller");
    }
    debug("Chiller shutdown");
    chillerRunning = false;
    emitter.emit("laser", { id: "chillerShutdown", name: "Chiller/Comperssor Shutdown" });
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
    // Abort startup flag
    startTimers.abortStartup = false;

    return new Promise(function(resolve, reject){
        // Check if the system is authorized first
        if (!authorized) {
            LEDs.red.blink(150);  // Blink red LED to indicate access denial
            setTimeout(function(){
                LEDs.red.enable();  // Disable red LED after 2 seconds
            }, 2000);
            return reject("Access Denied");
        }

        // Check the MQTT status: only proceed if the maintenance status is 'ok'
        if (maintenanceStatus !== 'ok') {
            LEDs.red.blink(150);  // Blink red LED to indicate maintenance mode
            setTimeout(function(){
                LEDs.red.enable();  // Disable red LED after 2 seconds
            }, 2000);
            return reject("Maintenance Overdue: Access Denied");
        }

        // Function to start the laser and blower components
        var startLaserAndBlower = function(){
            LEDs.green.enable();  // Turn on the green LED to indicate readiness
            setStatus({ id: "ready", name: "Ready" });

            // Start both the blower and laser
            return Promise.all([startBlower(), startLaser()])
                .then(resolve)  // Resolve the promise if successful
                .catch(reject); // Reject the promise if there's an error
        };

        // If there is a shutdown in progress, abort it
        if (startTimers.shutdown) {
            startTimers.abortShutdown = true;
        }

        // If the chiller is already running, start the laser and blower immediately
        if (chillerRunning) {
            debug("Chiller was already running, starting laser and blower immediately");
            return startLaserAndBlower();
        }

        // If the chiller is not running, start it first
        LEDs.green.blink(300);  // Blink green LED to indicate starting
        setStatus({ id: "starting", name: "Starting" });
        
        // Start the chiller and proceed with laser and blower startup
        startChiller().
            then(function(){
                startTimers.startup = null;  // Clear any existing startup timer

                // If the startup process was aborted, reject
                if (startTimers.abortStartup) {
                    debug("Startup aborted");
                    resolve("Startup aborted");
                } else {
                    // Mark the chiller as running and proceed with starting laser and blower
                    chillerRunning = true;
                    startLaserAndBlower();
                }
            });
    });
};


module.exports.shutdownAll = function(){
    if (startTimers.shutdown && !startTimers.abortShutdown){
        debug("Shutdown requested but it's already in progress");
        return;
    }
    startTimers.abortShutdown = false;
    setStatus({ id: "shuttingDown", name: "Shutting Down" });

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
                            setStatus({ id: "shutdown", name: "Shutdown" });
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
        LEDs.green.disable();
        setStatus({ id: "shutdown", name: "Shutdown" });
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
    }, 20000);
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

module.exports.startLaser = startLaser;
module.exports.startBlower = startBlower;
module.exports.startChiller = startChiller;

module.exports.shutdownLaser = shutdownLaser;
module.exports.shutdownBlower = shutdownBlower;
module.exports.shutdownChiller = shutdownChiller;

module.exports.getStatus = getStatus;
