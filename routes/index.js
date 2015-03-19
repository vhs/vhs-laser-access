"use strict";

var express = require('express'),
    auth = require('./auth'),
    router = express.Router();

/* Placeholder homepage */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'VHS' });
});

//router.use('/api', api.router);
router.use('/auth', auth.router);

module.exports.router = router;

module.exports.addMiddleware = function(app){
    auth.addMiddleware(app);
//    api.addMiddleware(app);
};

module.exports.addErrorHandlers = function(app){
//    api.addErrorHandlers(app, '/api');
};
