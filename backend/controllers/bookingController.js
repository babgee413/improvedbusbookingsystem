const { pool } = require('../config/db');

function generateBookingReference() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ATBU-${timestamp}-${random}`;
}

// POST /api/bookings - book a seat on a trip
// Uses a transaction with row locking so two users can't book the same seat
async function createBooking(req, res) {
    const connection = await pool.getConnection();
    try {
        const { trip_id, seat_id } = req.body;
        const user_id = req.user.id;

        if (!trip_id || !seat_id) {
            connection.release();
            return res.status(400).json({ message: 'trip_id and seat_id are required.' });
        }

        await connection.beginTransaction();

        const [seatRows] = await connection.query(
            'SELECT * FROM seats WHERE id = ? AND trip_id = ? FOR UPDATE',
            [seat_id, trip_id]
        );

        if (seatRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: 'Seat not found for this trip.' });
        }

        if (seatRows[0].is_booked) {
            await connection.rollback();
            connection.release();
            return res.status(409).json({ message: 'This seat is already booked.' });
        }

        await connection.query('UPDATE seats SET is_booked = TRUE WHERE id = ?', [seat_id]);

        const booking_reference = generateBookingReference();
        const [result] = await connection.query(
            `INSERT INTO bookings (user_id, trip_id, seat_id, booking_reference, status)
             VALUES (?, ?, ?, ?, 'pending')`,
            [user_id, trip_id, seat_id, booking_reference]
        );

        await connection.commit();
        connection.release();

        return res.status(201).json({
            message: 'Seat held. Complete payment to confirm your booking.',
            bookingId: result.insertId,
            booking_reference
        });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Create booking error:', error);
        return res.status(500).json({ message: 'Server error while creating booking.' });
    }
}

// GET /api/bookings/my - bookings for the logged-in user
async function getMyBookings(req, res) {
    try {
        const user_id = req.user.id;
        const [bookings] = await pool.query(
            `SELECT bk.id, bk.booking_reference, bk.status, bk.booked_at,
                    s.seat_number, t.departure_time, r.origin, r.destination
             FROM bookings bk
             JOIN seats s ON bk.seat_id = s.id
             JOIN trips t ON bk.trip_id = t.id
             JOIN routes r ON t.route_id = r.id
             WHERE bk.user_id = ?
             ORDER BY bk.booked_at DESC`,
            [user_id]
        );
        return res.status(200).json(bookings);
    } catch (error) {
        console.error('Get my bookings error:', error);
        return res.status(500).json({ message: 'Server error while fetching bookings.' });
    }
}

// PATCH /api/bookings/:id/cancel - cancel a booking and free the seat
async function cancelBooking(req, res) {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        await connection.beginTransaction();

        const [rows] = await connection.query(
            'SELECT * FROM bookings WHERE id = ? AND user_id = ? FOR UPDATE',
            [id, user_id]
        );

        if (rows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: 'Booking not found.' });
        }

        const booking = rows[0];

        await connection.query('UPDATE bookings SET status = "cancelled" WHERE id = ?', [id]);
        await connection.query('UPDATE seats SET is_booked = FALSE WHERE id = ?', [booking.seat_id]);

        await connection.commit();
        connection.release();

        return res.status(200).json({ message: 'Booking cancelled successfully.' });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Cancel booking error:', error);
        return res.status(500).json({ message: 'Server error while cancelling booking.' });
    }
}

module.exports = { createBooking, getMyBookings, cancelBooking };
