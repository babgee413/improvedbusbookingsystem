const API_BASE_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

if (!token || !user || user.role !== 'admin') {
    window.location.href = 'login.html';
}

const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

// ---------- Summary ----------
async function loadSummary() {
    const res = await fetch(`${API_BASE_URL}/admin/summary`, { headers: authHeaders });
    const data = await res.json();

    document.getElementById('summaryCards').innerHTML = `
        <div class="summary-card"><div class="value">${data.totalUsers}</div><div class="label">Total Users</div></div>
        <div class="summary-card"><div class="value">${data.scheduledTrips}</div><div class="label">Scheduled Trips</div></div>
        <div class="summary-card"><div class="value">${data.confirmedBookings}</div><div class="label">Confirmed Bookings</div></div>
        <div class="summary-card"><div class="value">₦${data.totalRevenue}</div><div class="label">Total Revenue</div></div>
    `;
}

// ---------- Routes ----------
async function loadRoutes() {
    const res = await fetch(`${API_BASE_URL}/admin/routes`, { headers: authHeaders });
    const routes = await res.json();

    document.getElementById('routesList').innerHTML = routes
        .map(r => `<div>#${r.id} — ${r.origin} → ${r.destination}</div>`)
        .join('');

    const select = document.getElementById('route_id');
    select.innerHTML = routes
        .map(r => `<option value="${r.id}">${r.origin} → ${r.destination}</option>`)
        .join('');
}

document.getElementById('routeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        origin: document.getElementById('origin').value,
        destination: document.getElementById('destination').value,
        distance_km: document.getElementById('distance_km').value || null
    };
    await fetch(`${API_BASE_URL}/admin/routes`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    e.target.reset();
    loadRoutes();
});

// ---------- Buses ----------
async function loadBuses() {
    const res = await fetch(`${API_BASE_URL}/admin/buses`, { headers: authHeaders });
    const buses = await res.json();

    document.getElementById('busesList').innerHTML = buses
        .map(b => `<div>#${b.id} — ${b.plate_number} (${b.capacity} seats)</div>`)
        .join('');

    const select = document.getElementById('bus_id');
    select.innerHTML = buses
        .map(b => `<option value="${b.id}">${b.plate_number} (${b.capacity} seats)</option>`)
        .join('');
}

document.getElementById('busForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        plate_number: document.getElementById('plate_number').value,
        capacity: parseInt(document.getElementById('capacity').value, 10)
    };
    await fetch(`${API_BASE_URL}/admin/buses`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    e.target.reset();
    document.getElementById('capacity').value = 18;
    loadBuses();
});

// ---------- Trips ----------
async function loadTrips() {
    const res = await fetch(`${API_BASE_URL}/admin/trips`, { headers: authHeaders });
    const trips = await res.json();

    const tbody = document.querySelector('#tripsTable tbody');
    tbody.innerHTML = trips.map(t => `
        <tr>
            <td>${t.origin} → ${t.destination}</td>
            <td>${t.plate_number}</td>
            <td>${new Date(t.departure_time).toLocaleString()}</td>
            <td>₦${t.fare}</td>
            <td>${t.seats_booked}/${t.capacity}</td>
            <td class="status-${t.status}">${t.status}</td>
            <td>${t.status === 'scheduled' ? `<button data-trip-id="${t.id}" class="cancelTripBtn">Cancel</button>` : ''}</td>
        </tr>
    `).join('');

    document.querySelectorAll('.cancelTripBtn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await fetch(`${API_BASE_URL}/admin/trips/${btn.dataset.tripId}/cancel`, { method: 'PATCH', headers: authHeaders });
            loadTrips();
            loadSummary();
        });
    });
}

document.getElementById('tripForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('tripFormMessage');
    const payload = {
        route_id: document.getElementById('route_id').value,
        bus_id: document.getElementById('bus_id').value,
        departure_time: document.getElementById('departure_time').value,
        fare: parseFloat(document.getElementById('fare').value)
    };

    const res = await fetch(`${API_BASE_URL}/admin/trips`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
    const data = await res.json();

    if (!res.ok) {
        msg.style.color = '#e05252';
        msg.textContent = data.message || 'Failed to create trip.';
        return;
    }

    msg.style.color = '#4ade80';
    msg.textContent = `Trip created with ${data.seatsGenerated} seats.`;
    e.target.reset();
    loadTrips();
    loadSummary();
});

// ---------- Bookings ----------
async function loadBookings() {
    const res = await fetch(`${API_BASE_URL}/admin/bookings`, { headers: authHeaders });
    const bookings = await res.json();

    const tbody = document.querySelector('#bookingsTable tbody');
    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>${b.booking_reference}</td>
            <td>${b.full_name}<br><small>${b.email}</small></td>
            <td>${b.origin} → ${b.destination}</td>
            <td>${b.seat_number}</td>
            <td>${new Date(b.departure_time).toLocaleString()}</td>
            <td class="status-${b.status}">${b.status}</td>
        </tr>
    `).join('');
}

// ---------- Logout ----------
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
});

// ---------- Init ----------
loadSummary();
loadRoutes();
loadBuses();
loadTrips();
loadBookings();
