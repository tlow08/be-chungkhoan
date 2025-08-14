const Watchlist = require('../models/watchlist.model');

// Thêm mã cổ phiếu vào watchlist
exports.addStock = async (req, res) => {
  try {
    const { symbol, buyPrice, note } = req.body;

    // Kiểm tra xem mã đã tồn tại trong watchlist của user chưa
    const existed = await Watchlist.findOne({ 
      userId: req.user.id, 
      symbol: symbol.toUpperCase() 
    });

    if (existed) {
      return res.status(400).json({
        success: false,
        message: 'Mã cổ phiếu này đã có trong danh sách theo dõi'
      });
    }

    const newItem = await Watchlist.create({
      userId: req.user.id, // Lấy từ middleware JWT
      symbol: symbol.toUpperCase(),
      buyPrice,
      note
    });

    res.json({ success: true, message: 'Thêm thành công', data: newItem });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Lấy danh sách watchlist theo user
exports.getWatchlist = async (req, res) => {
  try {
    const items = await Watchlist.find({ userId: req.user.id });
    res.json({ success: true, total: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Sửa thông tin cổ phiếu trong watchlist
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { symbol, buyPrice, note } = req.body;

    const item = await Watchlist.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { symbol, buyPrice, note },
      { new: true }
    );

    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy mục theo dõi' });

    res.json({ success: true, message: 'Cập nhật thành công', data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Xóa cổ phiếu khỏi watchlist
exports.deleteStock = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Watchlist.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Không tìm thấy mục theo dõi' });

    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
