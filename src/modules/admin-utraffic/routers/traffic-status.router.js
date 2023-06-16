const express = require('express');
const multer = require('multer');

const router = express.Router();
const controllers = require('../controllers/traffic-status.controller');
const middleware = require('../../../middlewares/auth');

const upload = multer({
  limits: { fileSize: 8000000 }, // Max 8 MB
});

router.get('/traffic-status', middleware.isAuthorizedAdminUtraffic, controllers.getTrafficStatus);
router.post('/traffic-status', middleware.isAuthorizedAdminUtraffic, controllers.updateTrafficStatus);
router.post('/speech-report', middleware.isAuthorizedAdminUtraffic, upload.single('record'), controllers.speechReport);

module.exports = router;
