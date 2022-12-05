const express = require('express');

const router = express.Router();
const voucher = require('./voucher');

router.use('/voucher', voucher);

module.exports = router;
