const sql = require('mssql');

class Database {

    #dbConfig = {
        user: 'MZCET',
        password: 'MZCET@1234',
        server: '103.207.1.91',
        database: 'CSE8882',
        options: {
            trustServerCertificate: true,
            encrypt: false
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
        }
    };

    #pool = null;

    async #connect() {
        try {
            if (this.#pool) {
                return this.#pool;
            }

            this.#pool = await sql.connect(this.#dbConfig);
            console.log("Database connected successfully.");
            return this.#pool;

        } catch (err) {
            console.error("Failed to connect to the database:", err.message);
            this.#pool = null;
            throw new Error("Database connection failed");
        }
    }

    async execQuery(query, params = {}) {
        try {

            const pool = await this.#connect();

            const request = pool.request();

            for (const key in params) {
                const { type, value } = params[key];
                request.input(key, type, value);
            }

            const result = await request.query(query);
            return result.recordset;

        } catch (err) {

            if (err.code === 'ECONNRESET' || err.message.includes('closed')) {
                console.warn("Connection lost. Retrying...");
                this.#pool = null;
                return this.execQuery(query, params);
            }

            console.error("Query execution failed:", err.message);
            throw err;
        }
    }

    async close() {
        try {
            if (this.#pool) {
                await this.#pool.close();
                this.#pool = null;
                console.log("Database connection closed.");
            }
        } catch (err) {
            console.error("Failed to close the database connection:", err.message);
        }
    }
}

module.exports = Database;
