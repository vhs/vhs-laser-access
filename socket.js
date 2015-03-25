module.exports.io = null;

module.exports.init = function(server){
    module.exports.io = require('socket.io')(server);
}