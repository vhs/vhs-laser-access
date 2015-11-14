"use strict";

var express = require('express'),
    router = express.Router(),
    passport = require('passport'),
    debug = require('debug')('laser:auth'),
    slack = require('../slack'),
    mmp = require('../mmp'),
    SlackStrategy = require('passport-slack').Strategy,
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    GitHubStrategy = require('passport-github').Strategy;

var config = require('../config');

function checkOauthService(user, done){
    debug(user);
    if (user.admin) {
        user.laser = true;
        return done(null, user);
    }

    mmp.checkAuth(user.provider, user.id)
        .then(function(valid){
            user.laser = valid;
            done(null, user);
        })
        .catch(done);
}

passport.use(
    new SlackStrategy({
            clientID: config.slack.clientID,
            clientSecret: config.slack.clientSecret,
            callbackURL: config.callbackHost + "/auth/slack/callback"
        },
        function(accessToken, refreshToken, profile, done) {
            var user = {
                id: profile.id,
                provider: profile.provider,
                name: profile.displayName
            };
            slack.userIdInGroup(accessToken, config.slack.adminGroup, user.id)
                .then(function(isAdmin) {
                    user.admin = isAdmin;
                    if (isAdmin) {
                        user.laser = true;
                    }
                    checkOauthService(user, done);
                })
                .catch(done);
        })
);

router.get("/slack/callback", passport.authenticate('slack', {
    failureRedirect: '/error',
    successRedirect: '/'
}));

router.get("/slack", passport.authenticate('slack', {
    scope: [ 'identify', 'groups:read' ], team: config.slack.team
}));

passport.use(new GoogleStrategy({
        clientID: config.google.clientID,
        clientSecret: config.google.clientSecret,
        callbackURL: config.callbackHost + "/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        var user = {
            id: profile.id,
            provider: profile.provider,
            name: profile.displayName
        };
        checkOauthService(user, done);
    }
));

router.get('/google',
    passport.authenticate('google', { scope: 'email', accessType: 'online', approvalPrompt: 'auto' }));

passport.use(new GitHubStrategy({
        clientID: config.github.clientID,
        clientSecret: config.github.clientSecret,
        callbackURL: config.callbackHost + "/auth/github/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        var user = {
            id: profile.id,
            provider: profile.provider,
            name: profile.displayName
        };
        checkOauthService(user, done);
    }
));

router.get("/google/callback", passport.authenticate('google', {
    failureRedirect: '/error',
    successRedirect: '/'
}));

router.get('/github', passport.authenticate('github'));

router.get("/github/callback", passport.authenticate('github', {
    failureRedirect: '/error',
    successRedirect: '/'
}));

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

router.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});

module.exports.mustHaveLaserAccess = function(req, res, next) {
    if (req.user && req.user.laser) {
        return next();
    }
    next({
        statusCode: 401,
        message: "Access Denied"
    });
};

module.exports.router = router;
module.exports.passport = passport;
