const express = require('express');
const multer = require('multer');
const controller = require('../controllers/speech-report');
const authMiddleware = require('../../../middlewares/auth');

const router = express.Router();
const upload = multer({
  limits: { fileSize: 8000000 }, // Max 8 MB
});

router.get('/scripts', controller.getSpeechRecordScript);

router.post('/', authMiddleware.isAnyUser, upload.single('record'), controller.user.postSpeechReport);
router.post('/collect', authMiddleware.isAnyUser, upload.single('record'), controller.user.collectSpeechRecord);

module.exports = router;
