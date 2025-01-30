const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/orders/all', orderController.getAllOrders);
router.get('/orders/user/:users_id', orderController.getUserOrders);  
router.get('/orders/:orderId', orderController.getOrderById);
router.get('/shop/orders/:shopId', orderController.getShopOrders);
router.post('/serve/:orderId', orderController.serveOrder);
router.get('/shops/:shopId/daily-stats', orderController.getShopDailyStats);
router.post('/new/orders', orderController.newOrders);
router.get('/orders/deliver/:deliverId', orderController.getDeliverOrders);  

module.exports = router;