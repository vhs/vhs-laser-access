"use strict";

var sinon = require("sinon"),
    Promise = require('bluebird');

var init;

module.exports.getApp = function(){
    var mainApp = require("../app");
    if (!init){
        mainApp.addHandler("/mock500", function(req, res, next){
            next("Unittest error");
        });
        mainApp.addHandler("/api/mock500", function(req, res, next){
            next("Unittest error");
        });
        init = true;
    }
    return mainApp.app();
};

module.exports.stubSlack = function(){
    var agent = require("superagent-promise");
    sinon.stub(agent, "get", function(url){
        return {
            query: function(){
                return this;
            },
            end: function(){
                return Promise.resolve({ body: require('./data/slack_list_groups.json')});
            }
        };
    });
};

module.exports.restoreSlackStub = function(){
    var agent = require("superagent-promise");
    agent.get.restore();
};