const postgres = require('postgres');
require('dotenv').config();

const { DATABASE_URL } = process.env;

const sql = postgres(DATABASE_URL, {
    ssl: 'require',
    transform: {
        column: postgres.toCamel, // Mengubah snake_case (db) -> camelCase (js)
        value: postgres.to,
        row: postgres.from
    }
});

module.exports = sql;
