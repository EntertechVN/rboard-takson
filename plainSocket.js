module.exports = function (io, port) {
    var net = require('net');

    // create plain TCP socket
    net.createServer(function (TCPSocket) {
        console.log('TCP created on port 5000');
        TCPSocket.on('data', function (data) {
            console.log('plain TCP message received ', data.toString());
        });
        TCPSocket.on('error', () => console.log('TCPSocket ERROR'));
    }).listen(port);
};