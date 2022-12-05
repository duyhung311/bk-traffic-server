const express = require('express');
const router = express.Router();

const atm = require('./atm');

router.use('/atm',atm);

module.exports = router;