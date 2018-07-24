let express = require('express');
let router = express.Router();
let Excel = require('exceljs');
let mongo = require('../mongo');

/* GET child boards listing. */
router.get('/', function (req, res, next) {
    res.render('boards')
});

router.get('/history', function (req, res, next) {
    res.render('boards-history')
});

router.get('/history/export', function (req, res, next) {
    let date = req.query.date;
    let BoardID = req.query.BoardID;
    mongo(function (db) {
        db.collection("bcons-history").find({BoardID: BoardID, date: date}).toArray(function (err, bcons) {
            let sheetTitle = `ID${BoardID}_${date.replace(/\//g, '_')}`;
            let workbook = new Excel.Workbook();
            let sheet = workbook.addWorksheet(sheetTitle);

            sheet.columns = [
                {header: 'TT Trạm', key: 'TT', width: 10},
                {header: 'Sản lượng', key: 'SLThucte', width: 10},
                {header: 'Tổng phát sinh đèn đỏ', key: 'CountR', width: 20},
                {header: 'Tổng phát sinh đèn vàng', key: 'CountY', width: 21},
                {header: 'Cycle time (giây)', key: 'CytSet', width: 15},
                {header: 'Cycle đèn vàng', key: 'CytYell', width: 15},
                {header: 'Cycle đèn đỏ', key: 'CytRed', width: 15},
            ];

            bconLamp = BconLamp.createMulti(bcons);
            bconLamp[0].lamps.forEach(function (lamp) {
                sheet.addRow({...lamp});
            });

            // save the file
            let fileName = `${sheetTitle}.xlsx`;
            console.log(fileName);
            res.attachment(fileName);
            workbook.xlsx.write(res)
                .then(function () {
                    res.end()
                });
        });
    });
});

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

module.exports = router;
