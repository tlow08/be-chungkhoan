const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Liên kết với User
    required: true,
    ref: 'User'
  },
  symbol: {
    type: String,
    required: [true, 'Mã cổ phiếu không được bỏ trống'],
    uppercase: true,
    trim: true
  },
  buyPrice: {
    type: Number,
    required: [true, 'Giá mua không được bỏ trống']
  },
  note: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
