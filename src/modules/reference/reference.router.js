const express = require('express');

const router = express.Router();
const controller = require('./reference.controller');

router.get('/reference/get-all', controller.getAllReferences);

router.post('/reference/add', controller.insertReference);

module.exports = router;
