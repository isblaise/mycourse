const express = require("express");
const router = express.Router();
const shopAuthController = require('../controllers/shopAuthController');
const { authenticateToken } = require('../middleware/auth');
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

router.post('/register', upload.fields([{ name: 'profilePhoto' }, { name: 'documentPhoto' }]), shopAuthController.registerStore);
router.post('/login', shopAuthController.loginStore);
router.get('/shop', authenticateToken, shopAuthController.getShopData);
router.get('/list', shopAuthController.getShopList);
router.get('/latest', shopAuthController.getLatestShops);

module.exports = router;