const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'ATBU Bus Booking API is running.' });
});

// Fallback for unmatched routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found.' });
});

const PORT = process.env.PORT || 5000;

testConnection().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
});
