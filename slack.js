"use strict";
var agent = require('superagent-promise'),
    _ = require('underscore');

module.exports.usersForGroup = function(token, groupId){
    return agent.get('https://slack.com/api/groups.list')
        .query({
            "token": token
        })
        .end()
        .then(function onResult(res) {
            var group = _.find(res.body.groups, function(group){ return group.id === groupId; });
            if (group) {
                return group.members;
            }
            return [];
        });
};