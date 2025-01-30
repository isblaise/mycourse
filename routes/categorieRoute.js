const express = require("express");
const multer = require("multer");
const router = express.Router();
const categorieController = require('../controllers/categorieController')
const { authenticateToken } = require('../middleware/auth');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/csv"); // Dossier où les fichiers seront stockés
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`); // Nom unique pour éviter les conflits
    },
  });
  
  const fileFilter = (req, file, cb) => {
    if (file.mimetype === "text/csv") {
      cb(null, true); // Accepter uniquement les fichiers CSV
    } else {
      cb(new Error("Seuls les fichiers CSV sont autorisés !"), false);
    }
  };
  
  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // Limite de taille : 2MB
  });


router.post('/addCategorie', authenticateToken, categorieController.addCategorie);
router.get('/:magasinId', categorieController.getCategorieByShopId);
router.get('/getCatById/:rayonId', categorieController.getCategorieByRayonId);
router.delete('/delete/:id', categorieController.deleteCategories);
router.put('/editeCategorie/:id', categorieController.updateCategorie);
router.post('/uploadCat', authenticateToken ,upload.single("file") , categorieController.uploadCategoriesByCsv);



module.exports = router;