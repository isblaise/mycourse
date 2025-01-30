const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const UploaderController = require('../controllers/uploadImage');

const uploadDir = path.join(__dirname, '..', 'uploads', 'images');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB par fichier
    files: 10 // Maximum 10 fichiers à la fois
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Seuls les fichiers JPEG, PNG et GIF sont acceptés.'), false);
    }
    cb(null, true);
  }
});

const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Le fichier est trop volumineux. Maximum 5MB par fichier.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop de fichiers. Maximum 10 fichiers à la fois.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Erreur lors de l\'upload: ' + error.message
    });
  }
  next(error);
};

router.post('/images', 
  upload.array('image', 10), 
  handleMulterError,
  UploaderController.uploadImages
);

router.get('/getshop/images/:shopId', UploaderController.getShopImages);

module.exports = router;