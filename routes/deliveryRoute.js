const express = require("express");
const router = express.Router();
const deliveryController = require('../controllers/deliveryController')
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});     

const upload = multer({ storage: storage });

router.post('/add', upload.fields([{ name: 'profilPhoto' }, { name: 'cnibPhoto' }, { name: 'cartegrisePhoto' }, { name: 'enginPhoto' }]), deliveryController.createDelivereAccount);

module.exports = router;
