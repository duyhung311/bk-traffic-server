const { Router } = require('express');
const controller = require('./public-data.controller');

const router = new Router();

router.post('/get-public-data', controller.getPublicData);

module.exports = router;
