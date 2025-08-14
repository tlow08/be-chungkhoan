const https = require('https');
const axios = require('axios');
const vnstock = require('vnstock-js');

// Lấy dữ liệu giao dịch theo mã (real-time trades)
exports.getStockTrades = (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const url = `https://bgapidatafeed.vps.com.vn/getliststocktrade/${symbol}`;

  https.get(url, { family: 4 }, (resp) => {
    let data = '';

    resp.on('data', chunk => data += chunk);
    resp.on('end', () => {
      try {
        const json = JSON.parse(data);

        if (!Array.isArray(json) || json.length === 0) {
          return res.status(404).json({ success: false, message: 'Không có dữ liệu giao dịch' });
        }

        res.json({
          success: true,
          symbol,
          trades: json.map(trade => ({
            time: trade.time,          // Thời gian giao dịch
            lastPrice: trade.lastPrice, // Giá khớp
            lastVol: trade.lastVol,     // Khối lượng khớp
            totalVol: trade.totalVol    // Khối lượng lũy kế
          }))
        });
      } catch (e) {
        res.status(500).json({ success: false, error: 'Không parse được JSON', raw: data });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ success: false, error: err.message });
  });
};

// Lấy dữ liệu cơ bản của nhiều mã
exports.getStocksData = async (req, res) => {
  try {
    const codes = req.query.codes;
    if (!codes) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã chứng khoán, ví dụ ?codes=FPT,ACB' });
    }

    const codeList = codes.split(',').map(code => code.trim().toUpperCase());
    let results = [];

    for (const code of codeList) {
      const url = `https://bgapidatafeed.vps.com.vn/getliststockdata/${code}`;
      const response = await axios.get(url);
      if (response.data && response.data.length > 0) {
        results.push(response.data[0]);
      }
    }

    res.json({
      success: true,
      total: results.length,
      data: results
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Lịch sử giá cổ phiếu
exports.getStockHistory = async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const result = await vnstock.stock.quote({ ticker: symbol, start: '2025-01-01' });
    res.json({ success: true, symbol, quote: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Top gainers
exports.getTopGainers = async (req, res) => {
  try {
    const data = await vnstock.stock.topGainers();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Top losers
exports.getTopLosers = async (req, res) => {
  try {
    const data = await vnstock.stock.topLosers();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};