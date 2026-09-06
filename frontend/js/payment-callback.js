const API_BASE_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');

const statusHeading = document.getElementById('statusHeading');
const statusMessage = document.getElementById('statusMessage');
const continueBtn = document.getElementById('continueBtn');

if (!token) {
    window.location.href = 'login.html';
}

async function confirmPayment() {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');

    if (!reference) {
        statusHeading.textContent = 'Missing payment reference';
        statusMessage.textContent = 'We could not find a payment reference in the URL.';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/payments/verify/${reference}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.status === 'successful') {
            statusHeading.textContent = 'Payment successful!';
            statusMessage.style.color = '#4ade80';
            statusMessage.textContent = 'Your seat is confirmed. Safe travels!';
        } else {
            statusHeading.textContent = 'Payment not completed';
            statusMessage.style.color = '#e05252';
            statusMessage.textContent = 'Your seat has been released. You can try booking again.';
        }
    } catch (error) {
        statusHeading.textContent = 'Something went wrong';
        statusMessage.textContent = 'Could not reach the server to confirm payment status.';
    }

    continueBtn.classList.remove('hidden');
}

continueBtn.addEventListener('click', () => {
    window.location.href = 'trips.html';
});

confirmPayment();
