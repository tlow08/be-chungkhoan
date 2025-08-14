const express = require('express');
const router = express.Router();
const stocksController = require('../controllers/stock.controller');

router.get('/', stocksController.getStocksData);
//Giao dịch cập nhật theo giờ
router.get('/trades/:symbol', stocksController.getStockTrades);

// vnstock Data
router.get('/history/:symbol', stocksController.getStockHistory);
router.get('/top-gainers', stocksController.getTopGainers);
router.get('/top-losers', stocksController.getTopLosers);

module.exports = router;
