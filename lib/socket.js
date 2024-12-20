// @ts-nocheck
const io = require('socket.io')

module.exports.io = null

module.exports.init = function (server) {
  module.exports.io = io(server)
}
