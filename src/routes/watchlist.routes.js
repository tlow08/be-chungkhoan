const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlist.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Tất cả route này cần đăng nhập
router.post('/', authMiddleware, watchlistController.addStock);
router.get('/', authMiddleware, watchlistController.getWatchlist);
router.put('/:id', authMiddleware, watchlistController.updateStock);
router.delete('/:id', authMiddleware, watchlistController.deleteStock);

module.exports = router;
