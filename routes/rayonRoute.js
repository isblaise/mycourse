const express = require("express");
const router = express.Router();
const multer = require("multer");
const rayonController = require('../controllers/rayonController');
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


router.post('/add', authenticateToken, rayonController.addRayon);
router.put('/edit/:id', rayonController.updateRayon);
router.delete('/delete/:id', rayonController.deleteRayon);
router.get('/:magasinId', rayonController.getRayonByShopId);
router.post('/upload', authenticateToken ,upload.single("file") ,rayonController.uploadRayonByCsv);

module.exports = router;
