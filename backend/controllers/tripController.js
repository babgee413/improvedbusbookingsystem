const { pool } = require('../config/db');

// GET /api/trips - list upcoming scheduled trips with route/bus info
async function getTrips(req, res) {
    try {
        const [trips] = await pool.query(
            `SELECT t.id, t.departure_time, t.fare, t.status,
                    r.origin, r.destination,
                    b.plate_number, b.capacity
             FROM trips t
             JOIN routes r ON t.route_id = r.id
             JOIN buses b ON t.bus_id = b.id
             WHERE t.status = 'scheduled'
             ORDER BY t.departure_time ASC`
        );
        return res.status(200).json(trips);
    } catch (error) {
        console.error('Get trips error:', error);
        return res.status(500).json({ message: 'Server error while fetching trips.' });
    }
}

// GET /api/trips/:id/seats - seat map for a specific trip
async function getTripSeats(req, res) {
    try {
        const { id } = req.params;
        const [seats] = await pool.query(
            'SELECT id, seat_number, is_booked FROM seats WHERE trip_id = ? ORDER BY seat_number ASC',
            [id]
        );

        if (seats.length === 0) {
            return res.status(404).json({ message: 'No seats found for this trip.' });
        }

        return res.status(200).json(seats);
    } catch (error) {
        console.error('Get trip seats error:', error);
        return res.status(500).json({ message: 'Server error while fetching seat map.' });
    }
}

module.exports = { getTrips, getTripSeats };
