// Usage: node scripts/makeAdmin.js user@example.com
// Promotes an existing registered user to the 'admin' role.

require('dotenv').config();
const { pool } = require('../config/db');

async function makeAdmin() {
    const email = process.argv[2];
    if (!email) {
        console.error('Usage: node scripts/makeAdmin.js <email>');
        process.exit(1);
    }

    const [result] = await pool.query(
        `UPDATE users SET role = 'admin' WHERE email = ?`,
        [email]
    );

    if (result.affectedRows === 0) {
        console.error(`No user found with email: ${email}`);
    } else {
        console.log(`${email} is now an admin.`);
    }

    process.exit(0);
}

makeAdmin().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
