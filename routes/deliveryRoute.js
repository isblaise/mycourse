const express = require("express");
const router = express.Router();
const deliveryController = require('../controllers/deliveryController')
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require("../middleware/auth");

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
router.get('/deliveres', deliveryController.getAllDeliveres);
router.get('/delivereData',authenticateToken,  deliveryController.getDelivereData);
router.post('/login/delivere', deliveryController.login);
router.get('/available-deliveres',authenticateToken,  deliveryController.getAvailableDeliveres);
router.patch('/delivere/:id/status',authenticateToken , deliveryController.updateDeliverStatus);
router.patch('/delivere/statuts/:id', authenticateToken, deliveryController.updateDeliverAvailability)



module.exports = router;
