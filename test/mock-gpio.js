"use strict";

var state = {
    watch: {}
};

function MockGpio(gpio, mode){
    this.gpio = gpio;
}

MockGpio.prototype.write = function(value, callback){
    state[this.gpio] = value;
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

module.exports.Gpio = MockGpio;
module.exports.state = state;

module.exports.setGpio = function (gpio, value){
    state[gpio] = value;
    state.watch[gpio](null, value);
};
