const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Đăng ký
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Tên, email và mật khẩu là bắt buộc' });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.json({
      success: true,
      message: 'Đăng ký thành công',
      user: { id: newUser._id, name: newUser.name, email: newUser.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Email không tồn tại' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Mật khẩu không đúng' });
    }

    // Nhúng name vào token
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
