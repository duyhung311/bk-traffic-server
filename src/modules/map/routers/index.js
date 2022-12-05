const express = require('express');

const router = express.Router();
const segment = require('./segment');

router.use('/segment', segment);

module.exports = router;
