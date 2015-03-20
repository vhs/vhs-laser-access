"use strict";

var express = require('express'),
    debug = require('debug')('laser:web'),
    mustHaveLaserAccess = require('./auth').mustHaveLaserAccess,
    laser = require('../laserAccess'),
    router = express.Router();

router.use("/", function(req, res, next){
    res.result = {};
    next();
});

router.all("/activate", mustHaveLaserAccess, function(req, res, next){
    laser.grantAccess();
    res.result.ok = true;
    next();
});

router.use("/", function(req, res, next){
    if (Object.keys(res.result).length>0){
        return res.json(res.result);
    }
    var err = new Error('Not Found');
    err.statusCode = 404;
    next(err);
});

module.exports.router = router;

module.exports.addErrorHandlers = function(app, path){
    app.use(path, function(err, req, res, next){ // jshint ignore:line
        var response = {
            "msg": err.message,
            "type": err.type,
            "status": err.statusCode || 500
        };
        if (response.status === 500) {
            debug(err);
        }
        res.status(err.statusCode || 500);
        return res.json(response);
    });
};
