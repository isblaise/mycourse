const express = require("express");
const router = express.Router();
const favoritePlaceController = require('../controllers/favoritePlaceController');

router.post('/register', favoritePlaceController.register);
router.get('/places/:userId', favoritePlaceController.getUserFavoritePlaces);

module.exports = router;