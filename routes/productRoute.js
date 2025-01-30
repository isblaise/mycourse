const express = require("express");
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = file.fieldname === 'file' ? 'uploads/csv' : 'uploads/images';
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const originalName = file.originalname.toLowerCase();
        const extension = path.extname(originalName);
        
        const allowedExtensions = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'text/csv': '.csv',
            'application/vnd.ms-excel': '.csv'
        };

        if (!allowedExtensions[file.mimetype]) {
            return cb(new Error('Extension de fichier non autorisée'));
        }

        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        if (file.fieldname === 'file') {
            cb(null, `csv-${uniqueSuffix}${extension}`);
        } else if (file.fieldname === 'image') {
            cb(null, `product-${uniqueSuffix}${extension}`);
        } else {
            cb(new Error('Type de champ non reconnu'));
        }
    }
});

const fileFilter = (req, file, cb) => {
    console.log('Type MIME reçu :', file.mimetype);
    
    if (file.fieldname === 'file') {
        cb(null, ['text/csv', 'application/vnd.ms-excel'].includes(file.mimetype));
    } else if (file.fieldname === 'image') {
        cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
    } else {
        cb(new Error(`Type de fichier non supporté pour le champ ${file.fieldname}`));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 100
    }
});

router.post('/upload/bulk', upload.single('file'), productController.uploadProductsByCsv);
router.post('/addproducts', upload.single('image'), productController.addProduct);
router.put('/productUpdate/:id', upload.single('image'), productController.updateProduct);
router.delete('/deleteproducts/:id', productController.deleteProduct);
router.get('/products/:id', productController.getProductById);
router.get('/products', productController.getAllProducts);
router.get('/products/shop/:shopId', productController.getProductsByStore);

module.exports = router;