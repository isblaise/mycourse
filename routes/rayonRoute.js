const express = require("express");
const router = express.Router();
const rayonController = require('../controllers/rayonController');
const { authenticateToken } = require('../middleware/auth');


router.post('/add', authenticateToken, rayonController.addRayon);
router.put('/edit/:id', rayonController.updateRayon);
router.delete('/delete/:id', rayonController.deleteRayon);
router.get('/:magasinId', rayonController.getRayonByShopId);

module.exports = router;
