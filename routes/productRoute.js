const express = require("express");
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

router.post('/addproducts', productController.addProduct);
router.put('/updateproducts/:id', productController.updateProduct);
router.delete('/deleteproducts/:id', productController.deleteProduct);
router.get('/products/:id', productController.getProductById);
router.get('/products', productController.getAllProducts);
router.get('/products/shop/:shopId', productController.getProductsByShop);

module.exports = router;
