let singleton = require('./singleton');
let slt = singleton();

let net = require('net');
let queryString = require('query-string');
let mongo = require('./mongo');
let moment = require('moment');

let TCPClients = 0;
let sockets = Object.create(null);

slt.bkdOff = slt.bconOff = false;

// get offTime setting
setInterval(function () {
    mongo(function (db) {
        (async () => {
            settings = await db.collection("setting").find().toArray();
            settings.forEach(function (st) {
                if (st.id === 0){
                    slt.bconOff = isOffTime(st.OffTime);
                }
                else if (st.id === 1){
                    slt.bkdOff = isOffTime(st.OffTime);
                }
            });
        })()
    });
}, 5000);

// Log setting
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

var transport = new (winston.transports.DailyRotateFile)({
    filename: 'log/system-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '100m',
    maxFiles: '90d'
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    defaultMeta: '',
    transports: [
        transport
    ]
});

module.exports = function (io, port) {
    // create plain TCP socket
    net.createServer(function (TCPSocket) {
        TCPSocket.setTimeout(30000);

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
            logger.info(`${moment().format('DD-MM-YYYY HH:mm:ss')} CLIENT ${clientName}: ${stringMessage}`);
            if (isValidateMessage(message)) {
                if (isBKD(message) && !slt.bkdOff) {
                    let bkd = parseQuery(stringMessage);
                    mongo(function (db) {
                        db.collection("bkds").update(
                            {BoardID: bkd.BoardID},
                            {$set: bkd},
                            {upsert: true}
                        ).then(function (){
                            io.sockets.emit('bkds updated');

                            // save to history
                            bkd.date = moment().format('D/M/Y');
                            mongo(function (db) {
                                db.collection("bkds-history").update(
                                    {BoardID: bkd.BoardID, date: bkd.date},
                                    {$set: bkd},
                                    {upsert: true}
                                );
                            })
                        });
                    });
                } else if (isBCON(message) && !slt.bconOff) {
                    let bcon = parseQuery(stringMessage);

                    mongo(function (db) {
                        db.collection("bcons").update(
                            {BoardID: bcon.BoardID},
                            {$set: bcon},
                            {upsert: true}
                        );

                        let responseData = {};
                        db.collection("setting").find({id: 0}).toArray(function (err, setting) {
                            responseData.setting = setting[0]
                        });

                        db.collection("bcons").find({BoardID: bcon.BoardID}).toArray(function (err, bcons) {
                            responseData.bcon = bcons[0];

                            var lastBCONID = 'lastBCON' + bcon.BoardID;
                            if (!slt[lastBCONID] || slt[lastBCONID] < moment().unix()) {
                                TCPSocket.write(response({
                                    Status: 'OK',
                                    ...filterBcon(responseData.bcon),
                                    ...filterSetting(responseData.setting),
                                }));
                                slt[lastBCONID] = moment().unix();
                            }
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
    return true;
    //return message && message.toString().indexOf(B_KD) !== -1;
}

function isBCON(message) {
    return message && message.toString().indexOf(B_CON) !== -1;
}

function response(object) {
    let responseString = '';
    Object.keys(object).forEach(function (key) {
        responseString += key + '=' + object[key] + '&';
    });

    responseString = responseString.slice(0, -1);
    logger.info(`${moment().format('DD-MM-YYYY HH:mm:ss')} SERVER: ${responseString}`);
    return responseString;
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
    let count = 0;

    Object.keys(objs).forEach(function (key) {
        // Get only Cyt data
        if (key.toString().indexOf('Cyt') !== -1) {
            rObjs[key] = objs[key];
        }

        // Count number of Light
        if (key.toString().indexOf('Light') !== -1) {
            count++;
        }
    });

    return sortCyt(rObjs, count);
}

function sortCa(setting) {
    let ordered = {};
    for (i = 1; i <= 12; i++) {
        ordered['TimeCaVao' + i] = setting['TimeCaVao' + i];
        ordered['TimeCaRa' + i] = setting['TimeCaRa' + i];
    }

    return ordered;
}

function sortCyt(bcon, count) {
    let ordered = {};
    for (i = 1; i <= count; i++) {
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

function isOffTime(offTime) {
    var momentOffTime = moment(offTime, 'HH:mm');
    var now = moment();
    var result = now >= momentOffTime || parseInt(now.format('HH')) < 5; // off from offTime & start from 5am

    console.log(offTime);
    console.log(momentOffTime);
    console.log(now);
    console.log(result);

    return result;
}

function SetResponseSingleton(responseObj, responseData, bkd) {
    var MThientaiID = 'MThientai' + bkd.BoardID;
    var SLThucteID = 'SLThucte' + bkd.BoardID;
    if (slt[MThientaiID]) {
        responseObj.MThientai = slt[MThientaiID].value;
        slt[MThientaiID].times--;
        if (slt[MThientaiID].times === 0){
            delete slt[MThientaiID];
        }
    }

    if (slt[SLThucteID]) {
        if(!responseObj.MThientai){
            responseObj.MThientai = responseData.bkd.MThientai;
        }

        responseObj.SLThucte = slt[SLThucteID].value;
        slt[SLThucteID].times--;
        if (slt[SLThucteID].times === 0){
            delete slt[SLThucteID];
        }
    }

    if (responseObj.MThientai && !responseObj.SLThucte){
        responseObj.SLThucte = responseData.bkd.SLThucte;
    }
    return responseObj;
}
