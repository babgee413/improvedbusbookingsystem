const API_BASE_URL = 'http://localhost:5000/api';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const formMessage = document.getElementById('formMessage');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (!response.ok) {
                formMessage.textContent = data.message || 'Login failed.';
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = data.user.role === 'admin' ? 'admin.html' : 'trips.html';
        } catch (error) {
            formMessage.textContent = 'Could not connect to server.';
        }
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            full_name: document.getElementById('full_name').value,
            matric_or_staff_no: document.getElementById('matric_or_staff_no').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (!response.ok) {
                formMessage.textContent = data.message || 'Registration failed.';
                return;
            }

            formMessage.style.color = '#4ade80';
            formMessage.textContent = 'Account created. Redirecting to login...';
            setTimeout(() => window.location.href = 'login.html', 1500);
        } catch (error) {
            formMessage.textContent = 'Could not connect to server.';
        }
    });
}
