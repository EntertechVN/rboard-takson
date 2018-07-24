let net = require('net');
let queryString = require('query-string');
let mongo = require('./mongo');
let moment = require('moment');

let TCPClients = 0;
let sockets = Object.create(null);

module.exports = function (io, port) {
    // create plain TCP socket
    net.createServer(function (TCPSocket) {
        TCPSocket.setTimeout(10000);

        TCPClients++;
        TCPSocket.nickname = "Con# " + TCPClients;
        let clientName = TCPSocket.nickname;

        sockets[clientName] = TCPSocket;
        TCPSocket.on('close', function () {
            delete sockets[clientName];
        });

        console.log('TCP created on port 5000', clientName);

        TCPSocket.on('timeout', function () {
            TCPSocket.destroy();
            delete sockets[clientName];
        });

        TCPSocket.on('data', function (message) {
            stringMessage = message.toString();
            console.log('TCP message received', clientName, stringMessage);
            if (isValidateMessage(message)) {
                if (isBKD(message)) {
                    let bkd = parseQuery(stringMessage);
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

                            TCPSocket.write(response({
                                Status: 'OK',
                                MTNgay: responseData.bkd.MTNgay || 0,
                                CycleTime: responseData.bkd.CycleTime || 0,
                                ...filterSetting(responseData.setting)
                            }));
                        });

                        io.sockets.emit('bkds updated')
                    });
                } else if (isBCON(message)) {
                    let bcon = parseQuery(stringMessage);

                    mongo(function (db) {
                        db.collection("bcons").update(
                            {BoardID: bcon.BoardID},
                            {$set: bcon},
                            {upsert: true}
                        );

                        let responseData = {};
                        db.collection("setting").find().toArray(function (err, setting) {
                            responseData.setting = setting[0]
                        });

                        db.collection("bcons").find({BoardID: bcon.BoardID}).toArray(function (err, bcons) {
                            responseData.bcon = bcons[0];

                            TCPSocket.write(response({
                                Status: 'OK',
                                ...filterBcon(responseData.bcon),
                                ...filterSetting(responseData.setting),
                            }));
                        });

                        io.sockets.emit('bcons updated')
                    });

                    // save to history
                    mongo(function (db) {
                        (async () => {
                            bcons = await db.collection("bcons").find({BoardID: bcon.BoardID}).toArray();
                            if (bcons.length > 0) {
                                let bconCopy = bcons[0];
                                bconCopy.date = moment().format('D/M/Y');
                                // prevent duplicate ID
                                delete bconCopy._id;

                                mongo(function (db) {
                                    db.collection("bcons-history").update(
                                        {BoardID: bconCopy.BoardID, date: bconCopy.date},
                                        {$set: bconCopy},
                                        {upsert: true}
                                    );
                                })
                            }
                        })()
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

function response(object) {
    //console.log(object);
    let responseString = '';
    Object.keys(object).forEach(function (key) {
        responseString += key + '=' + object[key] + '&';
    });

    return responseString.slice(0, -1);
}

function filterSetting(objs) {
    if (objs == null) return;
    let rObjs = {};
    Object.keys(objs).forEach(function (key) {
        obj = objs[key];
        if (obj.toString().indexOf(':') !== -1) {
            h = obj.split(':')[0];
            m = obj.split(':')[1];
            rObjs[key] = parseInt(h) * 60 + parseInt(m);
        } else {
            if (key.toString().indexOf('TimeCa') !== -1) {
                rObjs[key] = 0;
            }
        }
    });

    return sortCa(rObjs);
}

function filterBcon(objs) {
    if (objs == null) return;
    let rObjs = {};
    Object.keys(objs).forEach(function (key) {
        if (key.toString().indexOf('Cyt') !== -1) {
            rObjs[key] = objs[key];
        }
    });

    return sortCyt(rObjs);
}

function sortCa(setting) {
    let ordered = {};
    for (i = 1; i <= 12; i++) {
        ordered['TimeCaVao' + i] = setting['TimeCaVao' + i];
        ordered['TimeCaRa' + i] = setting['TimeCaRa' + i];
    }

    return ordered;
}

function sortCyt(bcon) {
    let ordered = {};
    for (i = 1; i <= 12; i++) {
        ordered['CytSet' + i] = bcon['CytSet' + i] || 0;
        ordered['CytRed' + i] = bcon['CytRed' + i] || 0;
        ordered['CytYell' + i] = bcon['CytYell' + i] || 0;
    }

    return ordered;
}

function parseQuery(message) {
    let parsed = queryString.parse(message);
    Object.keys(parsed).forEach(function (key) {
        if (Array.isArray(parsed[key])) {
            parsed[key] = parsed[key][0].replace('Manufactor', '');
        }
    });

    return parsed;
}