const { Router } = require('express');
const controller = require('./file.controller');

const router = new Router();

// router.get('/get-my-file',middleware.isAuthorizedUser,controller.user.getMyFiles);
router.post('/file/upload', controller.user.uploadFile);
// router.post(RouteName.createFolder,middleware.isAuthorizedUser,controller.user.createFolder);
// router.post(RouteName.deleteFiles,middleware.isAuthorizedUser,controller.user.deleteFiles);

module.exports = router;
