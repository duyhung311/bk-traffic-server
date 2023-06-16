const { Router } = require('express');
const controller = require('./app-version.controller');

const router = new Router();

router.get('/app-version/:id', controller.getAppVersion);

router.post('/app-version/update', controller.updateAppVersion);

module.exports = router;
