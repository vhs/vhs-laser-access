"use strict";

var express = require('express'),
    router = express.Router(),
    passport = require('passport'),
    debug = require('debug')('laser:auth'),
    slack = require('../slack'),
    SlackStrategy = require('passport-slack').Strategy;

var config = require('../config');

passport.use(
    new SlackStrategy({
            clientID: config.slack.clientID,
            clientSecret: config.slack.clientSecret,
            callbackURL: config.callbackHost + "/auth/slack/callback"
        },
        function(accessToken, refreshToken, profile, done) {
            debug(profile);
            done(null, {
                id: profile.id,
                provider: profile.provider,
                name: profile.displayName,
                accessToken: accessToken
            });
        })
);

passport.serializeUser(function (user, done) {
    var serialized = JSON.stringify(user);
    done(null, serialized);
});

passport.deserializeUser(function (serialized, done) {
    done(null, JSON.parse(serialized));
});

module.exports.addMiddleware = function (app) {
    app.use(passport.initialize());
    app.use(passport.session());
};

router.get("/slack/callback", passport.authenticate('slack', {
        failureRedirect: '/error',
        successRedirect: '/auth/test'
    }));


router.get("/slack", passport.authenticate('slack', {
        scope: [ 'identify' ], team: config.slack.team
    }));

router.get("/slack/admin", function(req, res, next){
    return passport.authenticate('slack', {
        scope: [ 'identify', 'read' ], team: config.slack.team
    })(req, res, next);
});

router.get("/test", function(req, res, next){
    if (!req.user) {
        res.status(401);
        return res.send("Access Denied");
    }
    slack.usersForGroup(req.user.accessToken, config.slack.adminGroup)
        .then(function(result){
            return res.json(result);
        })
        .catch(next);
});

module.exports.router = router;
module.exports.passport = passport;
