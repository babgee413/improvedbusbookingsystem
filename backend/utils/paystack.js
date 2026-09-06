const axios = require('axios');
require('dotenv').config();

const paystackClient = axios.create({
    baseURL: 'https://api.paystack.co',
    headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
    }
});

// Initializes a transaction and returns Paystack's authorization_url + reference
async function initializeTransaction({ email, amountInNaira, reference, callback_url, metadata }) {
    const response = await paystackClient.post('/transaction/initialize', {
        email,
        amount: Math.round(amountInNaira * 100), // Paystack expects amount in kobo
        reference,
        callback_url,
        metadata
    });
    return response.data.data; // { authorization_url, access_code, reference }
}

// Verifies a transaction by reference against Paystack's servers
async function verifyTransaction(reference) {
    const response = await paystackClient.get(`/transaction/verify/${encodeURIComponent(reference)}`);
    return response.data.data; // { status, amount, reference, ... }
}

module.exports = { initializeTransaction, verifyTransaction };
