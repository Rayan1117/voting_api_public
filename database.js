const sql = require('mssql');

class Database {
    #dbConfig = {
        user: 'MZCET',
        password: 'MZCET@1234',
        server: '103.207.1.91',
        database: 'CSE8761',
        options: {
            trustServerCertificate: true,
            encrypt: true
        },
    };

    #pool = null

    async #connect() {
        try {
            this.#pool = await sql.connect(this.#dbConfig);
            console.log("Database connected successfully.");
        } catch (err) {
            console.error("Failed to connect to the database:", err.message);
            throw err;
        }
    }

    async execQuery(query, params = {}) {
        try {
            if (!this.pool) {
                await this.#connect();
            }

            const request = this.#pool.request();

            for (const key in params) {
                const { type, value } = params[key];
                request.input(key, type, value);
            }
            
            const result = await request.query(query);
            return result.recordset;
        } catch (err) {
            console.error("Query execution failed:", err.message);
            throw err;
        }
    }
}

module.exports = Database;