const sql = require('./utils/db');
const jwt = require('jsonwebtoken');

const handler = async (event) => {
    const pathSegments = event.path.replace('/.netlify/functions', '').replace('/api', '').split('/');
    const id = pathSegments[2] ? pathSegments[2] : null;

    // CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    // Middleware Autentikasi untuk rute yang diproteksi
    const protectedMethods = ['POST', 'PUT', 'DELETE'];
    if (protectedMethods.includes(event.httpMethod)) {
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Akses ditolak." }) };
        }
        try {
            jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        } catch (error) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Token tidak valid." }) };
        }
    }

    try {
        // GET Semua Film (dengan filter)
        if (event.httpMethod === 'GET' && !id) {
            const { search, type } = event.queryStringParameters;
            let query = sql`SELECT id, "Title", "Year", "imdbID", "Type", "Poster" FROM movies`;
            if (search || type) {
                query = sql`SELECT id, "Title", "Year", "imdbID", "Type", "Poster" FROM movies WHERE 1=1`;
                if (search) query = sql`${query} AND "Title" ILIKE ${'%' + search + '%'}`;
                if (type && type !== 'all') query = sql`${query} AND "Type" = ${type}`;
            }
            const movies = await query;
            return { statusCode: 200, headers, body: JSON.stringify(movies) };
        }

        // GET Satu Film by ID
        if (event.httpMethod === 'GET' && id) {
            const movies = await sql`SELECT * FROM movies WHERE id = ${id}`;
            return { statusCode: 200, headers, body: JSON.stringify(movies[0]) };
        }

        // POST Film Baru
        if (event.httpMethod === 'POST') {
            const movie = JSON.parse(event.body);
            const [newMovie] = await sql`INSERT INTO movies ${sql(movie, 'Title', 'Year', 'imdbID', 'Type', 'Poster', 'Plot', 'Director', 'Actors', 'Genre', 'Runtime', 'TrailerURL')} RETURNING *`;
            return { statusCode: 201, headers, body: JSON.stringify(newMovie) };
        }

        // PUT (Update) Film
        if (event.httpMethod === 'PUT' && id) {
            const movie = JSON.parse(event.body);
            const [updatedMovie] = await sql`UPDATE movies SET ${sql(movie, 'Title', 'Year', 'Type', 'Poster', 'Plot', 'Director', 'Actors', 'Genre', 'Runtime', 'TrailerURL')} WHERE id = ${id} RETURNING *`;
            return { statusCode: 200, headers, body: JSON.stringify(updatedMovie) };
        }

        // DELETE Film
        if (event.httpMethod === 'DELETE' && id) {
            await sql`DELETE FROM movies WHERE id = ${id}`;
            return { statusCode: 200, headers, body: JSON.stringify({ message: "Konten berhasil dihapus." }) };
        }

        return { statusCode: 405, headers, body: JSON.stringify({ error: "Metode tidak diizinkan." }) };

    } catch (error) {
        console.error(error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Terjadi kesalahan pada server." }) };
    }
};

module.exports = { handler };
