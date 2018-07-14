var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/healthz', function(req, res, next) {
    res.send('OK')
});

router.get('/setting', function(req, res, next) {
    res.render('setting');
});

module.exports = router;
