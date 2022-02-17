let singleton = require('./singleton');
let slt = singleton();

mongo = require('./mongo');
let moment = require('moment');
module.exports = function (io) {
    io.on('connection', function (socket) {
        console.log('a client connected');

        socket.on('get bkds', function () {
            console.log('get bkds event received');
            mongo(function (db) {
                data = {};
                db.collection("bkds").find().toArray(function (err, bkds) {
                    data.bkds = bkds.sort((a, b) => (a.BoardID > b.BoardID) ? 1 : -1);
                    socket.emit('set bkds', data);
                });
            })
        });

        socket.on('get bkds-history', function (dateStr) {
            console.log('get bkds-history event received');
            mongo(function (db) {
                db.collection("bkds-history").find({date: dateStr}).toArray(function (err, bkds) {
                    socket.emit('set bkds-history', bkds);
                });
            })
        });

        socket.on('delete bkds-history', function (bkd) {
            mongo(function (db) {
                db.collection("bkds-history").removeOne(
                    {date: bkd.date, BoardID: bkd.BoardID}
                );
            });
            socket.emit('bkds-history updated')
        });

        socket.on('update bkd', function (bkd) {
            mongo(function (db) {
                db.collection("bkds").update(
                    {BoardID: bkd.BoardID},
                    {$set: bkd},
                    {upsert: true}
                );
            });
            socket.emit('bkds updated')
        });

        socket.on('delete bkd', function (BoardID) {
            mongo(function (db) {
                db.collection("bkds").removeOne(
                    {BoardID: BoardID}
                );

                socket.emit('bkds updated')
            });
        });

        socket.on('update TimeCa', function (timeArr) {
            let id = 0;
            mongo(function (db) {
                db.collection("setting").update(
                    {id: id},
                    {$set: {...timeArr, id: id}},
                    {upsert: true}
                )
            })
        });

        socket.on('update TimeCaBKD', function (timeArr) {
            let id = 1;
            mongo(function (db) {
                db.collection("setting").update(
                    {id: id},
                    {$set: {...timeArr, id: id}},
                    {upsert: true}
                )
            })
        });

        socket.on('get setting', function () {
            console.log('get setting event received');
            mongo(function (db) {
                db.collection("setting").find().toArray(function (err, settings) {
                    socket.emit('set setting', settings);
                });
            })
        });

        socket.on('get bcons', function () {
            console.log('get bcons event received');
            mongo(function (db) {
                db.collection("bcons").find().toArray(function (err, bcons) {
                    socket.emit('set bcons', BconLamp.createMulti(bcons));
                });
            })
        });

        socket.on('update bcon', function (bcon) {
            mongo(function (db) {
                db.collection("bcons").update(
                    {BoardID: bcon.BoardID},
                    {$set: bcon},
                    {upsert: true}
                );

                // save to history
                bcon.date = moment().format('D/M/Y');
                db.collection("bcons-history").update(
                    {BoardID: bcon.BoardID, date: bcon.date},
                    {$set: bcon},
                    {upsert: true}
                );
            });
            socket.emit('bcons updated')
        });

        socket.on('delete bcon', function (BoardID) {
            mongo(function (db) {
                db.collection("bcons").removeOne(
                    {BoardID: BoardID}
                );
            });
            socket.emit('bcons updated')
        });

        socket.on('get bcons-history', function (dateStr) {
            console.log('get bcons-history event received');
            mongo(function (db) {
                db.collection("bcons-history").find({date: dateStr}).toArray(function (err, bcons) {
                    socket.emit('set bcons-history', BconLamp.createMulti(bcons));
                });
            })
        });

        socket.on('delete bcon-history', function (bcon) {
            mongo(function (db) {
                db.collection("bcons-history").removeOne(
                    {date: bcon.date, BoardID: bcon.BoardID}
                );
            });
            socket.emit('bcon-history updated')
        });

        socket.on('update SLThucte', function (bkd) {
            slt['SLThucte' + bkd.BoardID] = {value: bkd.SLThucte, times: 2};
        });

        socket.on('update MThientai', function (bkd) {
            slt['MThientai' + bkd.BoardID] = {value: bkd.MThientai, times: 2}
        });
    });
};

class BconLamp {
    constructor(bcon) {
        this.BoardID = bcon.BoardID;
        let lamps = [];

        let keys = Object.keys(bcon);
        keys.forEach(function (key) {
            if (key.toString().indexOf('Light') !== -1) {
                let stt = key.toString().split('Light')[1];
                lamps.push(new Lamp(stt, bcon['CountR' + stt], bcon['CountY' + stt],
                    bcon['Light' + stt], bcon['SLThucte' + stt], bcon['CytSet' + stt],
                    bcon['CytYell' + stt], bcon['CytRed' + stt]))
            }
        });
        this.lamps = lamps.sort(lampSort);
    }

    static createMulti(bcons) {
        let bconLamps = [];
        bcons.forEach(function (bcon) {
            bconLamps.push(new BconLamp(bcon))
        });

        return bconLamps
    }
}

class Lamp {
    constructor(TT, CountR, CountY, Light, SLThucte, CytSet, CytYell, CytRed) {
        this.TT = TT;
        this.CountR = CountR;
        this.CountY = CountY;
        this.Light = Light;
        this.SLThucte = SLThucte;
        this.CytSet = CytSet;
        this.CytYell = CytYell;
        this.CytRed = CytRed;
    }
}

function lampSort(a, b) {
    if (parseInt(a.TT) < parseInt(b.TT)) return -1;
    return 1;
}
