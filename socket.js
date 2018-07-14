let mongo = require('./mongo');
module.exports = function (io) {
    io.on('connection', function (socket) {
        console.log('a client connected');

        socket.on('get data', function () {
            console.log('get data event received');
            mongo(function (db) {
                db.collection("bkds").find().toArray(function (err, result) {
                    socket.emit('set data', {bkds: result});
                });
            })
        })
    });
};