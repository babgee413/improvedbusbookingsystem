const crypto = require('crypto');
const { pool } = require('../config/db');
const { initializeTransaction, verifyTransaction } = require('../utils/paystack');
require('dotenv').config();

function generatePaystackReference() {
    return `PSK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// POST /api/payments/initialize
// Body: { booking_id }
// Starts a Paystack transaction for a pending booking and returns the
// authorization_url the frontend should redirect the user to.
async function initializePayment(req, res) {
    try {
        const { booking_id } = req.body;
        const user_id = req.user.id;
        const email = req.user.email;

        if (!booking_id) {
            return res.status(400).json({ message: 'booking_id is required.' });
        }

        const [rows] = await pool.query(
            `SELECT bk.id, bk.status, t.fare
             FROM bookings bk
             JOIN trips t ON bk.trip_id = t.id
             WHERE bk.id = ? AND bk.user_id = ?`,
            [booking_id, user_id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const booking = rows[0];
        if (booking.status !== 'pending') {
            return res.status(400).json({ message: `This booking is already ${booking.status}.` });
        }

        const reference = generatePaystackReference();
        const callback_url = `${process.env.FRONTEND_URL}/pages/payment-callback.html`;

        const paystackData = await initializeTransaction({
            email,
            amountInNaira: booking.fare,
            reference,
            callback_url,
            metadata: { booking_id, user_id }
        });

        await pool.query(
            `INSERT INTO payments (booking_id, amount, payment_method, paystack_reference, status)
             VALUES (?, ?, 'paystack', ?, 'pending')`,
            [booking_id, booking.fare, reference]
        );

        return res.status(200).json({
            message: 'Payment initialized.',
            authorization_url: paystackData.authorization_url,
            reference
        });
    } catch (error) {
        console.error('Initialize payment error:', error.response?.data || error.message);
        return res.status(500).json({ message: 'Could not initialize payment with Paystack.' });
    }
}

// GET /api/payments/verify/:reference
// Called by the frontend after Paystack redirects back, to confirm status
// and finalize the booking. Also safe to call from the webhook path.
async function verifyPayment(req, res) {
    const connection = await pool.getConnection();
    try {
        const { reference } = req.params;

        const [paymentRows] = await connection.query(
            'SELECT * FROM payments WHERE paystack_reference = ?',
            [reference]
        );
        if (paymentRows.length === 0) {
            connection.release();
            return res.status(404).json({ message: 'Payment record not found.' });
        }
        const payment = paymentRows[0];

        // Already processed — avoid re-confirming or double side-effects
        if (payment.status === 'successful') {
            connection.release();
            return res.status(200).json({ message: 'Payment already confirmed.', status: 'successful' });
        }

        const paystackResult = await verifyTransaction(reference);

        await connection.beginTransaction();

        if (paystackResult.status === 'success') {
            await connection.query(
                `UPDATE payments SET status = 'successful' WHERE paystack_reference = ?`,
                [reference]
            );
            await connection.query(
                `UPDATE bookings SET status = 'confirmed' WHERE id = ?`,
                [payment.booking_id]
            );

            await connection.commit();
            connection.release();
            return res.status(200).json({ message: 'Payment verified. Booking confirmed.', status: 'successful' });
        } else {
            await connection.query(
                `UPDATE payments SET status = 'failed' WHERE paystack_reference = ?`,
                [reference]
            );

            // Release the held seat so someone else can book it
            const [bookingRows] = await connection.query(
                'SELECT seat_id FROM bookings WHERE id = ?',
                [payment.booking_id]
            );
            if (bookingRows.length > 0) {
                await connection.query('UPDATE seats SET is_booked = FALSE WHERE id = ?', [bookingRows[0].seat_id]);
            }
            await connection.query(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`, [payment.booking_id]);

            await connection.commit();
            connection.release();
            return res.status(200).json({ message: 'Payment was not successful.', status: 'failed' });
        }
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Verify payment error:', error.response?.data || error.message);
        return res.status(500).json({ message: 'Could not verify payment.' });
    }
}

// POST /api/payments/webhook
// Paystack calls this server-to-server after every transaction event.
// Verifies the signature, then reuses the same confirmation logic.
async function handleWebhook(req, res) {
    try {
        const signature = req.headers['x-paystack-signature'];
        const hash = crypto
            .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
            .update(req.rawBody)
            .digest('hex');

        if (hash !== signature) {
            return res.status(401).json({ message: 'Invalid signature.' });
        }

        const event = req.body;

        if (event.event === 'charge.success') {
            const reference = event.data.reference;
            // Reuse the same verify-and-confirm logic as the manual flow
            req.params = { reference };
            return verifyPayment(req, res);
        }

        return res.status(200).json({ message: 'Event received.' });
    } catch (error) {
        console.error('Webhook error:', error.message);
        return res.status(500).json({ message: 'Webhook processing error.' });
    }
}

module.exports = { initializePayment, verifyPayment, handleWebhook };
