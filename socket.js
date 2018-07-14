let mongo = require('./mongo');
module.exports = function (io) {
    io.on('connection', function (socket) {
        console.log('a client connected');

        socket.on('get data', function () {
            console.log('get data event received');
            mongo(function (db) {
                data = {};
                db.collection("bkds").find().toArray(function (err, bkds) {
                    data.bkds = bkds;
                });

                db.collection("setting").find().toArray(function (err, setting) {
                    data.setting = setting[0];
                    socket.emit('set data', data);
                });
            })
        });

        socket.on('update CycleTime', function (cycleTime) {
            mongo(function (db) {
                db.collection("setting").update(
                    {id: 0},
                    {$set: {CycleTime: cycleTime, id: 0}},
                    {upsert: true}
                );
                //socket.emit('data updated')
            })
        });

        socket.on('update MTNgay', function (mtNgay) {
            mongo(function (db) {
                db.collection("setting").update(
                    {id: 0},
                    {$set: {MTNgay: mtNgay, id: 0}},
                    {upsert: true}
                );
            });
            socket.emit('data updated')
        });

        socket.on('update TimeCa', function (timeArr) {
            mongo(function (db) {
                db.collection("setting").update(
                    {id: 0},
                    {$set: {...timeArr, id: 0}},
                    {upsert: true}
                )
            })
        })
    });
};