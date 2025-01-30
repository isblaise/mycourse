const express = require("express");
const router = express.Router();
const authController = require('../controllers/usersAuthController');
const { authenticateToken } = require('../middleware/auth');


router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/admin/login', authController.adminLogin);
router.post('/change/password', authenticateToken, authController.changePassword);
router.get('/user', authenticateToken, authController.getUserData);
router.put('/update', authenticateToken, authController.updateUser);

module.exports = router;