let express = require('express');
let router = express.Router();
let Excel = require('exceljs');
let mongo = require('../mongo');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/history', function(req, res, next) {
    res.render('bkds-history');
});

router.get('/history/export', function (req, res, next) {
    let date = req.query.date;
    let BoardID = req.query.BoardID;
    mongo(function (db) {
        db.collection("bkds-history").find({BoardID: BoardID, date: date}).toArray(function (err, bkds) {
            let sheetTitle = `BKD_ID${BoardID}_${date.replace(/\//g, '_')}`;
            let workbook = new Excel.Workbook();
            let sheet = workbook.addWorksheet(sheetTitle);

            sheet.columns = [
                {header: 'LINE', key: 'BoardID', width: 10},
                {header: 'KẾ HOẠCH SẢN XUẤT/TARGET', key: 'MThientai', width: 10},
                {header: 'SẢN LƯỢNG HIỆN TẠI/ACTUAL', key: 'SLThucte', width: 10},
                {header: 'CHÊNH LỆCH/BALANCE', key: 'CL', width: 10},
                {header: 'HIỆU SUẤT/PERFORMANCE', key: 'HS', width: 10},
            ];

            bkds.forEach(function (bkd) {
                bkd.CL = bkd.MThientai - bkd.SLThucte;
                bkd.HS = Math.round((parseInt(bkd.SLThucte) * 100) / parseInt(bkd.MThientai));
                sheet.addRow({...bkd});
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

router.get('/healthz', function(req, res, next) {
    res.send('OK')
});

router.get('/setting', function(req, res, next) {
    res.render('setting');
});

module.exports = router;
