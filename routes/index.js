"use strict";

var express = require('express'),
    auth = require('./auth'),
    laser = require('../laserAccess'),
    debug = require('debug')('laser:web'),
    app = require('../app'),
    api = require('./api'),
    sio = require('../socket'),
    router = express.Router();


function laserStatus(req, res, next) {
    res.locals.status = laser.status;
    next();
}

router.use('/', function(req, res, next){
    res.locals.user = req.user;
    next();
});

/* Placeholder homepage */
router.get('/', laserStatus, function(req, res, next) {
    res.render('index', { title: 'VHS' });
});

router.use('/api', api.router);
router.use('/auth', auth.router);

module.exports.router = router;

module.exports.addMiddleware = function(app){
    auth.addMiddleware(app);
    sio.io.on('connection', function (socket) {
        socket.emit('status', laser.getStatus());
    });
};

module.exports.addErrorHandlers = function(app){
    api.addErrorHandlers(app, '/api');
};

laser.on("laser", function(event){
    debug("New event from laser " + event.id);
    sio.io.emit("laser", event);
});

laser.on("access", function(event){
    debug("New event from access " + event.id);
    sio.io.emit("access", event);
});

laser.on("status", function(event){
    debug("New event from status " + event.id);
    sio.io.emit("status", event);
});
