const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { initializePayment, verifyPayment, handleWebhook } = require('../controllers/paymentController');

router.post('/initialize', verifyToken, initializePayment);
router.get('/verify/:reference', verifyToken, verifyPayment);

// Paystack calls this directly (no user JWT) - authenticated by signature instead
router.post('/webhook', handleWebhook);

module.exports = router;
