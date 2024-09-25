const express = require('express')
const app = express()
const sql = require('mssql')

const PORT = process.env.PORT || 5000;

const pins = [1, 2, 3, 5, 6, 7, 8, 4];

app.use(express.json());

const dbConfig = {
    user: 'Shiranjan',
    password: 'ichigo@1',
    server: 'Shiranjan',
    database: 'express',
    options: {
        trustServerCertificate: true,
    },
};

app.post("/config", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request;
        const { id } = req.body;
        const { pins } = req.body;
        const pinsstring = JSON.stringify(pins)
        const query = 'INSERT INTO config (id,pins) VALUES (@id,@pins)';

        await request.input('id', sql.VarChar, id).input('pins', sql.NVarChar, pinsstring).query(query);

        res.send(pins);
    }
    catch (err) {
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

        res.send(`${id} , ${pins} are successfully retreived`)
    }
    catch (err) {
        res.send(`FAILED TO GET ${err.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
})