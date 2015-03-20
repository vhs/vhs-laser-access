"use strict";
var agent = require('superagent-promise'),
    _ = require('underscore');

function usersForGroup(token, groupId){
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
}

function userIdInGroup(token, groupId, userId) {
    return usersForGroup(token, groupId)
        .then(function(members){
            return members.indexOf(userId) >= 0;
        });
}

module.exports = {
    usersForGroup: usersForGroup,
    userIdInGroup: userIdInGroup
};