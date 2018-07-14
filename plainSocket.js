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
                    let bkd = parseBKD(stringMessage);
                    mongo(function (db) {
                        db.collection("bkds").update(
                            {BoardID: bkd.BoardID},
                            bkd,
                            {upsert: true}
                        );

                        db.collection("setting").find().toArray(function (err, result) {
                            TCPSocket.write(response({
                                status: 'OK',
                                ...timeToMinute(result[0])
                            }));
                        });

                        io.sockets.emit('data updated')
                    });
                } else if (isBCON(message)) {

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

class BangKhacDau {
    constructor(Manufactor, BoardID, BoardName, MThientai, SLThucte) {
        this.Manufactor = getUnique(Manufactor);
        this.BoardID = getUnique(BoardID);
        this.BoardName = getUnique(BoardName);
        this.MThientai = getUnique(MThientai);
        this.SLThucte = getUnique(SLThucte);
    }
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

function parseBKD(stringMessage) {
    let parsed = queryString.parse(stringMessage);
    return new BangKhacDau(parsed.Manufactor, parsed.BoardID, parsed.BoardName, parsed.MThientai, parsed.SLThucte)
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

    console.log(rObjs);

    return rObjs;
}