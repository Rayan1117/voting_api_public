const express = require('express');
const cors = require('cors');  // Import cors package
const sql = require('mssql');
const app = express();

const PORT = process.env.PORT ||5000;

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
        const { id,candinames, pins,grouppins,vote } = req.body;
        const pinsstring = JSON.stringify(pins);
        const candstring=JSON.stringify(candinames);
        const grpstring=JSON.stringify(grouppins);
        const votestring=JSON.stringify(vote);
        const query = 'INSERT INTO config (id,candidatenames,pins,grouppins,vote) VALUES (@id,@candidatenames,@pins,@grouppins,@vote)';
        await request.input('id', sql.VarChar, id).input('candidatenames',sql.NVarChar,candstring).input('pins', sql.NVarChar, pinsstring).input('grouppins',sql.NVarChar,grpstring).input('vote',sql.NVarChar,votestring).query(query);
        res.send(id,candinames,pins,grouppins,vote);
    } catch (err) {
        console.log(err);
        res.status(500).send("FAILED TO Push");
    }
});

app.get("/config/:tableName", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request;
        const { tableName } = req.params;
        const query = `SELECT TOP 1 * FROM ${tableName} ORDER BY id DESC`;
        const response = await request.query(query);
        const result = response.recordset[0];
        console.log(result)
        const { id, candidatenames,pins,grouppins,vote } = result;
        res.send(`${id} , ${candidatenames},${pins},${grouppins} , ${vote}`);
    } catch (err) {
        res.send(`FAILED TO GET ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
