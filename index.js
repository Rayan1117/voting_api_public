const express = require('express');
const cors = require('cors');  // Import cors package
const sql = require('mssql');
const app = express();

const PORT = process.env.PORT || 5000;

// Enable CORS for all routes and origins
app.use(cors());  // Use cors as middleware

app.use(express.json());

const dbConfig = {
    user: 'MZCET',
    password: 'MZCET@1234',
    server: '103.207.1.91',
    database: 'CSE8761',
    options: {
        trustServerCertificate: true,
    },
};
async function createTableWithCustomName(tableName) {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request(pool);

        // Check if the table already exists and create it if it doesn't
        const createTableQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}')
            BEGIN
                CREATE TABLE ${tableName} (
                    recordId INT IDENTITY(1,1) PRIMARY KEY,
                    timestamp DATETIME,
                    vote NVARCHAR(40),
                    additionalInfo NVARCHAR(100)
                );
            END;
        `;
        await request.query(createTableQuery);
        console.log(`Table '${tableName}' is ready`);
        return tableName;
    } catch (err) {
        console.error('Error creating table', err);
        throw err;
    }
}   await createTableWithCustomName(tableName);
// Your existing routes

app.post("/config", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request;
        const { tableName, id, candinames, pins, grouppins } = req.body;
        const pinsstring = JSON.stringify(pins);
        const candstring = JSON.stringify(candinames);
        const grpstring = JSON.stringify(grouppins);
        const tname = JSON.stringify(tableName);
        const query = `INSERT INTO ${tname} (id,candidatenames,pins,grouppins) VALUES (@id,@candidatenames,@pins,@grouppins)`;
        await request.input('id', sql.VarChar, id).input('candidatenames', sql.NVarChar, candstring).input('pins', sql.NVarChar, pinsstring).input('grouppins', sql.NVarChar, grpstring).query(query);
        res.send(id, candinames, pins, grouppins);
    } catch (err) {
        console.log(err);
        res.status(500).send("FAILED TO Push");
    }
});


app.get("/combine", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request;

        const query = 'SELECT * FROM config JOIN configvotes on config.id=configvotes.id'

        const response = await request.query(query);
        const result = response.recordset[0];
        const { id, candidatenames, pins, grouppins, NONE, vote } = result;
        res.send(`${id[0]} , ${candidatenames},${pins},${grouppins}, ${vote}`);

    }
    catch (err) {
        res.send(err.message);
    }
}
)


app.get("/config/:tableName", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request;
        const { tableName } = req.params;
        const query = `SELECT TOP 1 * FROM ${tableName} ORDER BY id DESC`;
        const response = await request.query(query);
        const result = response.recordset[0];
        console.log(result)
        const { id, candidatenames, pins, grouppins } = result;
        res.send(`${id} , ${candidatenames},${pins},${grouppins} `);
    } catch (err) {
        res.send(`FAILED TO GET ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
