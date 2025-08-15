const Watchlist = require('../models/watchlist.model');
const https = require('https');
const { Server } = require('socket.io');
const cron = require('node-cron');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Hàm lấy giá cổ phiếu từ VNDirect (từ trang đầu tiên)
function fetchPrice(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://api-finfo.vndirect.com.vn/v4/effective_secinfo?q=code:${symbol}`;

    const options = {
      family: 4,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };

    https.get(url, options, (resp) => {
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => {
        try {
          if (data.startsWith('Access Denied')) {
            return reject(new Error('VNDirect chặn truy cập: ' + data));
          }
          const json = JSON.parse(data);
          if (!json.data || json.data.length === 0) return resolve(null);
          const stock = json.data[0];
          resolve({
            symbol: stock.code,
            basicPrice: stock.basicPrice, // Giá tham chiếu
            ceilPrice: stock.ceilPrice,   // Giá trần
            floorPrice: stock.floorPrice, // Giá sàn
            matchPrice: stock.matchPrice, // Giá khớp lệnh
            tradingDate: stock.tradingDate
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Hàm cập nhật watchlist và phát dữ liệu qua Socket.IO
async function updateWatchlist() {
  try {
    const users = await Watchlist.distinct('userId');
    
    for (const userId of users) {
      const items = await Watchlist.find({ userId });
      const enrichedItems = [];

      for (const item of items) {
        try {
          const data = await fetchPrice(item.symbol);
          
          if (data) {
            // Chuẩn hóa giá: định dạng tối đa 2 số thập phân
            const yesterdayPrice = Number((data.basicPrice || 0).toFixed(2));
            const currentPrice = Number((data.matchPrice || 0).toFixed(2));
            const buyPrice = Number((item.buyPrice || 0).toFixed(2)); // Không chia 100 như VPS

            const buyPriceYesterdayDiff = yesterdayPrice !== 0 
              ? (((currentPrice - yesterdayPrice) / yesterdayPrice) * 100).toFixed(2) 
              : 0;
            const buyPriceDiff = buyPrice !== 0 
              ? (((currentPrice - buyPrice) / buyPrice) * 100).toFixed(2) 
              : 0;

            enrichedItems.push({
              _id: item._id,
              symbol: item.symbol,
              buyPrice,
              yesterdayPrice,
              currentPrice,
              buyPriceYesterdayDiff: `${buyPriceYesterdayDiff}%`,
              buyPriceDiff: `${buyPriceDiff}%`,
              note: item.note,
              tradingDate: data.tradingDate
            });
          } else {
            enrichedItems.push({
              _id: item._id,
              symbol: item.symbol,
              buyPrice: Number((item.buyPrice || 0).toFixed(2)),
              yesterdayPrice: 0,
              currentPrice: 0,
              buyPriceYesterdayDiff: '0%',
              buyPriceDiff: '0%',
              note: item.note,
              tradingDate: null
            });
          }
        } catch (error) {
          enrichedItems.push({
            _id: item._id,
            symbol: item.symbol,
            buyPrice: Number((item.buyPrice || 0).toFixed(2)),
            yesterdayPrice: 0,
            currentPrice: 0,
            buyPriceYesterdayDiff: '0%',
            buyPriceDiff: '0%',
            note: item.note,
            tradingDate: null
          });
        }
      }

      io.to(userId.toString()).emit('watchlistUpdate', {
        success: true,
        total: enrichedItems.length,
        data: enrichedItems
      });
    }
    console.log('Cập nhật watchlist hoàn tất:', new Date().toLocaleString());
  } catch (err) {
    console.error('Lỗi khi cập nhật watchlist:', err.message);
  }
}

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId.toString());
    console.log(`Client ${socket.id} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Lên lịch cập nhật watchlist mỗi 5 phút
cron.schedule('*/5 * * * *', () => {
  console.log('Bắt đầu cập nhật watchlist...');
  updateWatchlist();
});

// Thêm mã cổ phiếu vào watchlist
exports.addStock = async (req, res) => {
  try {
    const { symbol, buyPrice, note } = req.body;

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
      userId: req.user.id,
      symbol: symbol.toUpperCase(),
      buyPrice: Number(buyPrice || 0), // Lưu giá gốc
      note
    });

    await updateWatchlist();

    res.json({ 
      success: true, 
      message: 'Thêm thành công', 
      data: {
        ...newItem._doc,
        buyPrice: Number((newItem.buyPrice || 0).toFixed(2))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Lấy danh sách watchlist theo user với thông tin giá
exports.getWatchlist = async (req, res) => {
  try {
    const items = await Watchlist.find({ userId: req.user.id });
    const enrichedItems = [];

    for (const item of items) {
      try {
        const data = await fetchPrice(item.symbol);
        
        if (data) {
          const yesterdayPrice = Number((data.basicPrice || 0).toFixed(2));
          const currentPrice = Number((data.matchPrice || 0).toFixed(2));
          const buyPrice = Number((item.buyPrice || 0).toFixed(2));

          const buyPriceYesterdayDiff = yesterdayPrice !== 0 
            ? (((currentPrice - yesterdayPrice) / yesterdayPrice) * 100).toFixed(2) 
            : 0;
          const buyPriceDiff = buyPrice !== 0 
            ? (((currentPrice - buyPrice) / buyPrice) * 100).toFixed(2) 
            : 0;

          enrichedItems.push({
            _id: item._id,
            symbol: item.symbol,
            buyPrice,
            yesterdayPrice,
            currentPrice,
            buyPriceYesterdayDiff: `${buyPriceYesterdayDiff}%`,
            buyPriceDiff: `${buyPriceDiff}%`,
            note: item.note,
            tradingDate: data.tradingDate
          });
        } else {
          enrichedItems.push({
            _id: item._id,
            symbol: item.symbol,
            buyPrice: Number((item.buyPrice || 0).toFixed(2)),
            yesterdayPrice: 0,
            currentPrice: 0,
            buyPriceYesterdayDiff: '0%',
            buyPriceDiff: '0%',
            note: item.note,
            tradingDate: null
          });
        }
      } catch (error) {
        enrichedItems.push({
          _id: item._id,
          symbol: item.symbol,
          buyPrice: Number((item.buyPrice || 0).toFixed(2)),
          yesterdayPrice: 0,
          currentPrice: 0,
          buyPriceYesterdayDiff: '0%',
          buyPriceDiff: '0%',
          note: item.note,
          tradingDate: null
        });
      }
    }

    res.json({ success: true, total: enrichedItems.length, data: enrichedItems });
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
      { symbol: symbol.toUpperCase(), buyPrice: Number(buyPrice || 0), note },
      { new: true }
    );

    if (!item) return res.status(404).json({ success: false, message: 'Không tìm thấy mục theo dõi' });

    await updateWatchlist();

    res.json({ 
      success: true, 
      message: 'Cập nhật thành công', 
      data: {
        ...item._doc,
        buyPrice: Number((item.buyPrice || 0).toFixed(2))
      }
    });
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

    await updateWatchlist();

    res.json({ success: true, message: 'Xóa thành công' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};