const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();

// Kết nối DB
connectDB();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/stocks', require('./routes/stock.routes'));
app.use('/api/watchlist', require('./routes/watchlist.routes'));

app.get('/', (req, res) => {
  res.json({ message: 'API is running 🚀' });
});

module.exports = app;
