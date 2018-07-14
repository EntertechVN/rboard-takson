let net = require('net');
let queryString = require('query-string');
let mongo = require('./mongo');
module.exports = function (io, port) {
    // create plain TCP socket
    net.createServer(function (TCPSocket) {
        console.log('TCP created on port 5000');

        TCPSocket.on('data', function (message) {
            stringMessage = message.toString();
            console.log('plain TCP message received ', stringMessage);
            if (isValidateMessage(message)) {
                if (isBKD(message)) {
                    let bkd = queryString.parse(stringMessage);
                    mongo(function (db) {
                        db.collection("bkds").update(
                            {BoardID: bkd.BoardID},
                            {$set: bkd},
                            {upsert: true}
                        );

                        let responseData = {};
                        db.collection("setting").find().toArray(function (err, setting) {
                            responseData.setting = setting[0]
                        });

                        db.collection("bkds").find({BoardID: bkd.BoardID}).toArray(function (err, bkds) {
                            responseData.bkd = bkds[0];
                            console.log(responseData.bkd);

                            TCPSocket.write(response({
                                status: 'OK',
                                MTNgay: responseData.bkd.MTNgay,
                                CycleTime: responseData.bkd.CycleTime,
                                ...timeToMinute(responseData.setting)
                            }));
                        });

                        io.sockets.emit('bkds updated')
                    });
                } else if (isBCON(message)) {
                    let bcon = queryString.parse(stringMessage);

                    mongo(function (db) {
                        db.collection("bcons").update(
                            {BoardID: bcon.BoardID},
                            {$set: bcon},
                            {upsert: true}
                        );
                    });
                }
            }
        });

        TCPSocket.on('error', function (err) {
            console.log('TCPSocket ERROR: ' + err)
        });

    }).listen(port);
};

const B_KD = 'KhacDau';
const B_CON = 'Tramcon';

function getUnique(value) {
    if (value !== undefined && Array.isArray(value)) {
        return value[0];
    }
    return value;
}

function isValidateMessage(message) {
    return message && message.toString().indexOf('Manufactor') !== -1;
}

function isBKD(message) {
    return message && message.toString().indexOf(B_KD) !== -1;
}

function isBCON(message) {
    return message && message.toString().indexOf(B_CON) !== -1;
}

function response(data) {
    return queryString.stringify(data)
}

function timeToMinute(objs) {
    if (objs == null) return;
    let rObjs = {};
    Object.keys(objs).forEach(function (key) {
        obj = objs[key];
        if (obj.toString().indexOf(':') !== -1) {
            h = obj.split(':')[0];
            m = obj.split(':')[1];
            rObjs[key] = parseInt(h) * 60 + parseInt(m);
        } else {
            rObjs[key] = obj;
        }
    });

    return rObjs;
}