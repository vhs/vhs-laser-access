"use strict";

var Promise = require('bluebird');

function Led(gpio){
    Promise.promisifyAll(gpio);
    this.gpio = gpio;
    this.on = false;
    this.blinkInterval = false;
}

Led.prototype.enable = function(){
    this.on = true;
    if (this.blinkInterval){
        clearInterval(this.blinkInterval);
    }
    return this.gpio.writeAsync(1);
};

Led.prototype.disable = function(){
    this.on = false;
    if (this.blinkInterval){
        clearInterval(this.blinkInterval);
    }
    return this.gpio.writeAsync(0);
};

Led.prototype.toggle = function(){
    this.on = !this.on;
    return this.gpio.writeAsync(this.on ? 1 : 0);
};

Led.prototype.blink = function(delay){
    var Led = this;
    if (!this.blinkInterval){
        this.blinkInterval = setInterval(function(){
            Led.toggle();
        }, delay);
        return this.enable();
    }
    return Promise.resolve();
};

module.exports.Led = Led;