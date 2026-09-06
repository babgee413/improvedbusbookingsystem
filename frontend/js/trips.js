const API_BASE_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

const tripsList = document.getElementById('tripsList');
const seatMapSection = document.getElementById('seatMapSection');
const seatMap = document.getElementById('seatMap');
const tripsMessage = document.getElementById('tripsMessage');
const confirmBookingBtn = document.getElementById('confirmBookingBtn');
const logoutBtn = document.getElementById('logoutBtn');

let selectedTripId = null;
let selectedSeatId = null;

async function loadTrips() {
    try {
        const response = await fetch(`${API_BASE_URL}/trips`);
        const trips = await response.json();

        tripsList.innerHTML = '';
        if (trips.length === 0) {
            tripsList.innerHTML = '<p>No scheduled trips available right now.</p>';
            return;
        }

        trips.forEach((trip) => {
            const card = document.createElement('div');
            card.className = 'trip-card';
            card.innerHTML = `
                <div>
                    <strong>${trip.origin} &rarr; ${trip.destination}</strong><br>
                    <span>${new Date(trip.departure_time).toLocaleString()}</span><br>
                    <span>Fare: ₦${trip.fare} | Bus: ${trip.plate_number}</span>
                </div>
                <button data-trip-id="${trip.id}">Select Seat</button>
            `;
            tripsList.appendChild(card);
        });

        document.querySelectorAll('.trip-card button').forEach((btn) => {
            btn.addEventListener('click', () => loadSeatMap(btn.dataset.tripId));
        });
    } catch (error) {
        tripsMessage.textContent = 'Could not load trips. Is the server running?';
    }
}

async function loadSeatMap(tripId) {
    selectedTripId = tripId;
    selectedSeatId = null;

    try {
        const response = await fetch(`${API_BASE_URL}/trips/${tripId}/seats`);
        const seats = await response.json();

        seatMap.innerHTML = '';
        seats.forEach((seat) => {
            const div = document.createElement('div');
            div.className = `seat ${seat.is_booked ? 'booked' : ''}`;
            div.textContent = seat.seat_number;
            div.dataset.seatId = seat.id;

            if (!seat.is_booked) {
                div.addEventListener('click', () => {
                    document.querySelectorAll('.seat.selected').forEach((s) => s.classList.remove('selected'));
                    div.classList.add('selected');
                    selectedSeatId = seat.id;
                });
            }

            seatMap.appendChild(div);
        });

        seatMapSection.classList.remove('hidden');
    } catch (error) {
        tripsMessage.textContent = 'Could not load seat map.';
    }
}

confirmBookingBtn.addEventListener('click', async () => {
    if (!selectedTripId || !selectedSeatId) {
        tripsMessage.textContent = 'Please select a seat first.';
        return;
    }

    try {
        // Step 1: hold the seat with a pending booking
        const bookingRes = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ trip_id: selectedTripId, seat_id: selectedSeatId })
        });
        const bookingData = await bookingRes.json();

        if (!bookingRes.ok) {
            tripsMessage.style.color = '#e05252';
            tripsMessage.textContent = bookingData.message || 'Booking failed.';
            return;
        }

        // Step 2: start a Paystack transaction for that booking
        const payRes = await fetch(`${API_BASE_URL}/payments/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ booking_id: bookingData.bookingId })
        });
        const payData = await payRes.json();

        if (!payRes.ok) {
            tripsMessage.style.color = '#e05252';
            tripsMessage.textContent = payData.message || 'Could not start payment.';
            return;
        }

        // Step 3: send the user to Paystack's checkout page
        window.location.href = payData.authorization_url;
    } catch (error) {
        tripsMessage.textContent = 'Could not connect to server.';
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

loadTrips();
