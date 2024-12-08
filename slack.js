// @ts-nocheck
'use strict'

const agent = require('superagent-promise')
const _ = require('underscore')

function usersForGroup(token, groupId) {
  return agent
    .get('https://slack.com/api/groups.list')
    .query({
      token
    })
    .end()
    .then(function onResult(res) {
      const group = _.find(res.body.groups, function (group) {
        return group.id === groupId
      })
      if (group) {
        return group.members
      }
      return []
    })
}

function userIdInGroup(token, groupId, userId) {
  return usersForGroup(token, groupId).then(function (members) {
    return members.indexOf(userId) >= 0
  })
}

module.exports = {
  usersForGroup,
  userIdInGroup
}
