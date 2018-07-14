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
        });

        socket.on('update CycleTime', function (cycleTime) {
            mongo(function (db) {
                db.collection("setting").update(
                    {id: 0},
                    {$set: {CycleTime: cycleTime, id: 0}},
                    {upsert: true}
                )
            })
        });

        socket.on('update MTNgay', function (mtNgay) {
            mongo(function (db) {
                db.collection("setting").update(
                    {id: 0},
                    {$set: {MTNgay: mtNgay, id: 0}},
                    {upsert: true}
                )
            })
        })
    });
};