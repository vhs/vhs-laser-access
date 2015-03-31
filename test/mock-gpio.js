"use strict";

var laserAccess = require("../laserAccess"),
    debug = require('debug')('laser:gpio'),
    readline = require('readline');

var state = {
    watch: {}
};

function MockGpio(gpio, mode){
    this.gpio = gpio;
}

MockGpio.prototype.write = function(value, callback){
    state[this.gpio] = value;
    this.printStats();
    callback();
};

MockGpio.prototype.read = function(pin, callback){
    callback(null, state[this.gpio]);
};

MockGpio.prototype.readSync = function() {
    return state[this.gpio];
};

MockGpio.prototype.watch = function(callback){
    state.watch[this.gpio] = callback;
};

MockGpio.prototype.printStats = function(){
    var gpios = laserAccess.gpios;
    var status = state[gpios.GPIO_LASER] === 1 ? green("o") : red("o");
    status += state[gpios.GPIO_BLOWER] === 1 ? green("o") : red("o");
    status += state[gpios.GPIO_CHILLER] === 1 ? green("o") : red("o");
    if (status !== this.lastStatus){
        debug(status);
        this.lastStatus = status;
    }
};

function red(string) {
    return color(31, string);
}

function green(string) {
    return color(32, string);
}

function color(code, string){
    return "\x1b[" + code + "m" + string + "\x1b[0m"
}

module.exports.Gpio = MockGpio;
module.exports.state = state;

module.exports.setGpio = function (gpio, value){
    state[gpio] = value;
    state.watch[gpio](null, value);
};

if (process.argv[2] && process.argv[2] === "--gpio-in") {
    debug("Using stdin for gpio switch contro");
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', function (line) {
        var gpios = laserAccess.gpios;
        if (line === "0"){
            state[gpios.GPIO_MAIN_SWITCH] = 0;
            state.watch[gpios.GPIO_MAIN_SWITCH]();
        } else if (line === "1") {
            state[gpios.GPIO_MAIN_SWITCH] = 1;
            state.watch[gpios.GPIO_MAIN_SWITCH]();
        }
    });
}