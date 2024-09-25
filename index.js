const express = require('express')
const app = express()
const sql = require('mssql')

const PORT = process.env.PORT || 5000;

const pins = [1, 2, 3, 5, 6, 7, 8, 4];

app.use(express.json());

dbConfig = {
    server: 'MZCETDB',
    database: 'CSE8761',
    user: 'MZCET',
    password: 'MZCET@1234',
    options: {
        trustServerCertificate: true
    }
}

app.post("/config", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request;
        const { id } = req.body;
        const { pins } = req.body;
        const query = 'INSERT INTO config (id,pins) VALUES (@id,@pins)';

        await request.input('id', sql.VarChar, id).input('pins', sql.NVarChar, pins).query(query);

        res.send(pins);
    }
    catch (err) {
        console.log(err);
        res.status(500).send("FAILED");

    }
});

app.get("/test", (req, res) => {
    res.send(pins);
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})