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
                    socket.emit('set data', data);
                });
            })
        });

        socket.on('update bkd', function (bkd) {
            mongo(function (db) {
                db.collection("bkds").update(
                    {BoardID: bkd.BoardID},
                    {$set: bkd},
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