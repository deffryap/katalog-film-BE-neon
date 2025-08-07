const sql = require('./utils/db');
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
    const pathSegments = event.path.replace('/.netlify/functions', '').replace('/api', '').split('/');
    const id = pathSegments[2] ? parseInt(pathSegments[2]) : null;
    const headers = { 
        'Access-Control-Allow-Origin': 'https://katalog-film-fe.netlify.app/',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization', 
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' 
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    const protectedMethods = ['POST', 'PUT', 'DELETE'];
    if (protectedMethods.includes(event.httpMethod)) {
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return { statusCode: 401, headers, body: JSON.stringify({ error: "Akses ditolak." }) };
        try {
            jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        } catch (error) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Token tidak valid." }) };
        }
    }

    try {
        if (event.httpMethod === 'GET' && !id) {
            const { search, type } = event.queryStringParameters || {};
            // Menggunakan nama kolom snake_case yang benar
            let query = sql`SELECT id, title, year, imdb_id, type, poster FROM movies`;
            if (search || (type && type !== 'all')) {
                query = sql`SELECT id, title, year, imdb_id, type, poster FROM movies WHERE 1=1`;
                if (search) query = sql`${query} AND title ILIKE ${'%' + search + '%'}`;
                if (type && type !== 'all') query = sql`${query} AND type = ${type}`;
            }
            const movies = await query;
            return { statusCode: 200, headers, body: JSON.stringify(movies) };
        }

        if (event.httpMethod === 'GET' && id) {
            const movies = await sql`SELECT * FROM movies WHERE id = ${id}`;
            return { statusCode: 200, headers, body: JSON.stringify(movies[0]) };
        }

        if (event.httpMethod === 'POST') {
            const movie = JSON.parse(event.body);
            // Menggunakan nama kolom snake_case yang benar
            const [newMovie] = await sql`INSERT INTO movies ${sql(movie, 'title', 'year', 'imdb_id', 'type', 'poster', 'plot', 'director', 'actors', 'genre', 'runtime', 'trailer_url')} RETURNING *`;
            return { statusCode: 201, headers, body: JSON.stringify(newMovie) };
        }

        if (event.httpMethod === 'PUT' && id) {
            const movie = JSON.parse(event.body);
            // Menggunakan nama kolom snake_case yang benar
            const [updatedMovie] = await sql`UPDATE movies SET ${sql(movie, 'title', 'year', 'type', 'poster', 'plot', 'director', 'actors', 'genre', 'runtime', 'trailer_url')} WHERE id = ${id} RETURNING *`;
            return { statusCode: 200, headers, body: JSON.stringify(updatedMovie) };
        }

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
