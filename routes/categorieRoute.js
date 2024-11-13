const express = require("express");
const router = express.Router();
const categorieController = require('../controllers/categorieController')
const { authenticateToken } = require('../middleware/auth');


router.post('/addCategorie', authenticateToken, categorieController.addCategorie);
router.get('/:magasinId', categorieController.getCategorieByShopId);
router.get('/getCatById/:rayonId', categorieController.getCategorieByRayonId);
router.delete('/delete/:id', categorieController.deleteCategories);
router.put('/editeCategorie/:id', categorieController.updateCategorie);

module.exports = router;