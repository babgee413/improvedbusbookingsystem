const { pool } = require('../config/db');

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------

// POST /api/admin/routes
async function createRoute(req, res) {
    try {
        const { origin, destination, distance_km } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ message: 'Origin and destination are required.' });
        }

        const [result] = await pool.query(
            'INSERT INTO routes (origin, destination, distance_km) VALUES (?, ?, ?)',
            [origin, destination, distance_km || null]
        );

        return res.status(201).json({ message: 'Route created.', routeId: result.insertId });
    } catch (error) {
        console.error('Create route error:', error);
        return res.status(500).json({ message: 'Server error while creating route.' });
    }
}

// GET /api/admin/routes
async function getRoutes(req, res) {
    try {
        const [routes] = await pool.query('SELECT * FROM routes ORDER BY id ASC');
        return res.status(200).json(routes);
    } catch (error) {
        console.error('Get routes error:', error);
        return res.status(500).json({ message: 'Server error while fetching routes.' });
    }
}

// ------------------------------------------------------------
// Buses
// ------------------------------------------------------------

// POST /api/admin/buses
async function createBus(req, res) {
    try {
        const { plate_number, capacity } = req.body;
        if (!plate_number) {
            return res.status(400).json({ message: 'Plate number is required.' });
        }

        const [result] = await pool.query(
            'INSERT INTO buses (plate_number, capacity) VALUES (?, ?)',
            [plate_number, capacity || 18]
        );

        return res.status(201).json({ message: 'Bus added.', busId: result.insertId });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'A bus with this plate number already exists.' });
        }
        console.error('Create bus error:', error);
        return res.status(500).json({ message: 'Server error while adding bus.' });
    }
}

// GET /api/admin/buses
async function getBuses(req, res) {
    try {
        const [buses] = await pool.query('SELECT * FROM buses ORDER BY id ASC');
        return res.status(200).json(buses);
    } catch (error) {
        console.error('Get buses error:', error);
        return res.status(500).json({ message: 'Server error while fetching buses.' });
    }
}

// ------------------------------------------------------------
// Trips (creating a trip auto-generates its seats from bus capacity)
// ------------------------------------------------------------

// POST /api/admin/trips
async function createTrip(req, res) {
    const connection = await pool.getConnection();
    try {
        const { route_id, bus_id, departure_time, fare } = req.body;

        if (!route_id || !bus_id || !departure_time || fare === undefined) {
            connection.release();
            return res.status(400).json({ message: 'route_id, bus_id, departure_time, and fare are required.' });
        }

        await connection.beginTransaction();

        const [busRows] = await connection.query('SELECT capacity FROM buses WHERE id = ?', [bus_id]);
        if (busRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: 'Bus not found.' });
        }
        const capacity = busRows[0].capacity;

        const [routeRows] = await connection.query('SELECT id FROM routes WHERE id = ?', [route_id]);
        if (routeRows.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ message: 'Route not found.' });
        }

        const [tripResult] = await connection.query(
            `INSERT INTO trips (route_id, bus_id, departure_time, fare, status)
             VALUES (?, ?, ?, ?, 'scheduled')`,
            [route_id, bus_id, departure_time, fare]
        );
        const trip_id = tripResult.insertId;

        // Auto-generate seats S1..S{capacity} for this trip
        const seatValues = [];
        for (let i = 1; i <= capacity; i++) {
            seatValues.push([trip_id, `S${i}`]);
        }
        await connection.query('INSERT INTO seats (trip_id, seat_number) VALUES ?', [seatValues]);

        await connection.commit();
        connection.release();

        return res.status(201).json({
            message: 'Trip created and seats generated.',
            tripId: trip_id,
            seatsGenerated: capacity
        });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Create trip error:', error);
        return res.status(500).json({ message: 'Server error while creating trip.' });
    }
}

// GET /api/admin/trips - all trips regardless of status, with booked-seat counts
async function getAllTrips(req, res) {
    try {
        const [trips] = await pool.query(
            `SELECT t.id, t.departure_time, t.fare, t.status,
                    r.origin, r.destination, b.plate_number, b.capacity,
                    (SELECT COUNT(*) FROM seats s WHERE s.trip_id = t.id AND s.is_booked = TRUE) AS seats_booked
             FROM trips t
             JOIN routes r ON t.route_id = r.id
             JOIN buses b ON t.bus_id = b.id
             ORDER BY t.departure_time DESC`
        );
        return res.status(200).json(trips);
    } catch (error) {
        console.error('Get all trips error:', error);
        return res.status(500).json({ message: 'Server error while fetching trips.' });
    }
}

// PATCH /api/admin/trips/:id/cancel
async function cancelTrip(req, res) {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            `UPDATE trips SET status = 'cancelled' WHERE id = ?`,
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Trip not found.' });
        }
        return res.status(200).json({ message: 'Trip cancelled.' });
    } catch (error) {
        console.error('Cancel trip error:', error);
        return res.status(500).json({ message: 'Server error while cancelling trip.' });
    }
}

// ------------------------------------------------------------
// Bookings (admin-wide view)
// ------------------------------------------------------------

// GET /api/admin/bookings
async function getAllBookings(req, res) {
    try {
        const [bookings] = await pool.query(
            `SELECT bk.id, bk.booking_reference, bk.status, bk.booked_at,
                    u.full_name, u.email, u.matric_or_staff_no,
                    s.seat_number, t.departure_time, r.origin, r.destination
             FROM bookings bk
             JOIN users u ON bk.user_id = u.id
             JOIN seats s ON bk.seat_id = s.id
             JOIN trips t ON bk.trip_id = t.id
             JOIN routes r ON t.route_id = r.id
             ORDER BY bk.booked_at DESC`
        );
        return res.status(200).json(bookings);
    } catch (error) {
        console.error('Get all bookings error:', error);
        return res.status(500).json({ message: 'Server error while fetching bookings.' });
    }
}

// ------------------------------------------------------------
// Dashboard summary
// ------------------------------------------------------------

// GET /api/admin/summary
async function getSummary(req, res) {
    try {
        const [[userCount]] = await pool.query('SELECT COUNT(*) AS count FROM users');
        const [[tripCount]] = await pool.query(`SELECT COUNT(*) AS count FROM trips WHERE status = 'scheduled'`);
        const [[bookingCount]] = await pool.query(`SELECT COUNT(*) AS count FROM bookings WHERE status = 'confirmed'`);
        const [[revenue]] = await pool.query(
            `SELECT COALESCE(SUM(t.fare), 0) AS total
             FROM bookings bk
             JOIN trips t ON bk.trip_id = t.id
             WHERE bk.status = 'confirmed'`
        );

        return res.status(200).json({
            totalUsers: userCount.count,
            scheduledTrips: tripCount.count,
            confirmedBookings: bookingCount.count,
            totalRevenue: revenue.total
        });
    } catch (error) {
        console.error('Get summary error:', error);
        return res.status(500).json({ message: 'Server error while fetching summary.' });
    }
}

module.exports = {
    createRoute, getRoutes,
    createBus, getBuses,
    createTrip, getAllTrips, cancelTrip,
    getAllBookings,
    getSummary
};
