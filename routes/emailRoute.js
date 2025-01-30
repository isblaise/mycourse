const express = require("express");
const router = express.Router();
const EmailController = require('../controllers/sendEmail');


router.post('/send/email', EmailController.SendEmail);

module.exports = router;