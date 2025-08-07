const postgres = require('postgres');
require('dotenv').config();

// Ambil URL database dari environment variable yang disediakan Netlify
const { DATABASE_URL } = process.env;

// Buat koneksi ke database Neon
const sql = postgres(DATABASE_URL, {
    ssl: 'require',
});

module.exports = sql;
