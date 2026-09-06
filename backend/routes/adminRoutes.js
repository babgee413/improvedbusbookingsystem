const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
    createRoute, getRoutes,
    createBus, getBuses,
    createTrip, getAllTrips, cancelTrip,
    getAllBookings,
    getSummary
} = require('../controllers/adminController');

// Every admin route requires a valid token AND the 'admin' role
router.use(verifyToken, requireRole('admin'));

router.get('/summary', getSummary);

router.post('/routes', createRoute);
router.get('/routes', getRoutes);

router.post('/buses', createBus);
router.get('/buses', getBuses);

router.post('/trips', createTrip);
router.get('/trips', getAllTrips);
router.patch('/trips/:id/cancel', cancelTrip);

router.get('/bookings', getAllBookings);

module.exports = router;
