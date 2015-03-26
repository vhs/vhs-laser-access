'use strict';

var config = require('./config'),
    _ = require('underscore'),
    debug = require('debug')('laser:mmp'),
    agent = require('superagent-promise');


module.exports.checkAuth = function(service, id){
    return agent('POST', config.mmpUrl)
        .send({service:service, id:id})
        .set('X-Api-Key', config.mmpApiKey)
        .end()
        .then(function(res){
            return JSON.parse(res.text);
        })
        .catch(function(err){
            //Log this for now and proceed to the next promise
            console.error(err);
            return {"valid": false, error: true};
        })
        .then(function(user){
            debug(user);
            var haslaser = false;
            if (user && user.valid && user.privileges){
                _.each(user.privileges, function(priv){
                    if (priv.code === 'laser'){
                        haslaser = true;
                    }
                });
            }
            return haslaser;
        });
};