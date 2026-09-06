const express = require('express');
const router = express.Router();
const { getTrips, getTripSeats } = require('../controllers/tripController');

router.get('/', getTrips);
router.get('/:id/seats', getTripSeats);

module.exports = router;
