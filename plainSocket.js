let net = require('net');
let queryString = require('query-string');
module.exports = function (io, port) {
    // create plain TCP socket
    net.createServer(function (TCPSocket) {
        console.log('TCP created on port 5000');

        TCPSocket.on('data', function (message) {
            stringMessage = message.toString();
            console.log('plain TCP message received ', stringMessage);
            if (isValidateMessage(message)) {
                if (isBKD(message)) {
                    console.log(parseBKD(stringMessage));
                    //@TODO SEND MESSAGE
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