const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Route test bảo vệ
router.get('/profile', authMiddleware, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
