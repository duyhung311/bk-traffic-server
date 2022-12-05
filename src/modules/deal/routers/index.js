const express = require('express');

const router = express.Router();
const deal = require('./deal');

router.use('/voucher', deal);

module.exports = router;
