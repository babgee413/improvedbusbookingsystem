const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

// POST /api/auth/register
async function register(req, res) {
    try {
        const { full_name, matric_or_staff_no, email, phone, password, role } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ message: 'Full name, email, and password are required.' });
        }

        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
            `INSERT INTO users (full_name, matric_or_staff_no, email, phone, password_hash, role)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [full_name, matric_or_staff_no || null, email, phone || null, password_hash, role || 'student']
        );

        return res.status(201).json({
            message: 'Account created successfully.',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ message: 'Server error during registration.' });
    }
}

// POST /api/auth/login
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        return res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error during login.' });
    }
}

module.exports = { register, login };
