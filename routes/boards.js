var express = require('express');
var router = express.Router();

/* GET child boards listing. */
router.get('/', function(req, res, next) {
  res.send('BOARDS');
});

module.exports = router;
