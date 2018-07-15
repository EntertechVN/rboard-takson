var express = require('express');
var router = express.Router();

/* GET child boards listing. */
router.get('/', function(req, res, next) {
  res.render('boards')
});

router.get('/history', function(req, res, next) {
  res.render('boards-history')
});

module.exports = router;
