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

// Your existing routes
app.post("/config", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request;
        const { id, candnames, pins } = req.body;
        const pinsstring = JSON.stringify(pins);
        const query = 'INSERT INTO config (id,candidatenames,pins) VALUES (@id,@candidatenames,@pins)';
        await request.input('id', sql.VarChar, id).input('candidatenames', sql.NVarChar, candnames).input('pins', sql.NVarChar, pinsstring).query(query);
        res.send(pins);
    } catch (err) {
        console.log(err);
        res.status(500).send("FAILED");
    }
});

app.get("/test", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request;
        const query = 'SELECT TOP 1 * FROM config ORDER BY id DESC';
        const response = await request.query(query);
        const result = response.recordset[0];
        const { id, pins } = result;
        res.send(`${id} , ${pins}`);
    } catch (err) {
        res.send(`FAILED TO GET ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
