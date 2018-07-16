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
            let workbook = new Excel.Workbook();
            bcons.forEach(function (bcon) {

            });

            // save the file
            let fileName = `ID${BoardID}_${date.replace(/\//g, '_')}.xlsx`;
            console.log(fileName);
            res.attachment(fileName);
            workbook.xlsx.write(res)
                .then(function () {
                    res.end()
                });
        });
    });
});

module.exports = router;
