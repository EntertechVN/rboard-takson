module.exports = function (app) {
    var http = require('http').Server(app);
    var io = require('socket.io')(http);

    io.on('connection', function (socket) {
        console.log('a client connected');
    });

    http.listen(3000, function () {
        console.log('socket listening on *:3000');
    });
};