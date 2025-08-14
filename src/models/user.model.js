const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên không được bỏ trống']
  },
  email: {
    type: String,
    required: [true, 'Email không được bỏ trống'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Mật khẩu không được bỏ trống']
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
