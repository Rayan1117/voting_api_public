const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;
app.use(cors());
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

// Function to create a table if it doesn't exist
const createTableIfNotExists = async (tableName) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request();
        const createTableQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}')
            BEGIN
                CREATE TABLE ${tableName} (
                    id NVARCHAR(50) PRIMARY KEY,
                    candidatenames NVARCHAR(MAX),
                    pins NVARCHAR(MAX),
                    grouppins NVARCHAR(MAX)
                );
            END
        `;
        await request.query(createTableQuery);
        console.log(`Table ${tableName} created or already exists.`);
    } catch (err) {
        console.log("Error creating table:", err);
    }
};

io.on('connection', (socket) => {
    console.log("A user connected:", socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Endpoint to handle configuration posting
app.post("/config", async (req, res) => {
    const { tableName, id, candinames, pins, grouppins } = req.body;

    try {
        // Create the table if it doesn't exist
        await createTableIfNotExists(tableName);

        const pool = await sql.connect(dbConfig);
        const request = new sql.Request();
        const pinsstring = JSON.stringify(pins);
        const candstring = JSON.stringify(candinames);
        const grpstring = JSON.stringify(grouppins);

        const query = `INSERT INTO ${tableName} (id, candidatenames, pins, grouppins) VALUES (@id, @candidatenames, @pins, @grouppins)`;
        await request.input('id', sql.VarChar, id)
            .input('candidatenames', sql.NVarChar, candstring)
            .input('pins', sql.NVarChar, pinsstring)
            .input('grouppins', sql.NVarChar, grpstring)
            .query(query);
        
        io.emit('data', { id, pinsstring });
        res.send({ id, candinames, pins, grouppins });
    } catch (err) {
        console.log(err);
        res.status(500).send("FAILED TO Push");
    }
});

// Endpoint to combine configurations
app.get("/combine", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request();

        const query = 'SELECT * FROM config JOIN configvotes on config.id=configvotes.id';
        const response = await request.query(query);
        const result = response.recordset[0];
        const { id, candidatenames, pins, grouppins, NONE, vote } = result;
        res.send(`${id[0]} , ${candidatenames}, ${pins}, ${grouppins}, ${vote}`);
    } catch (err) {
        res.send(err.message);
    }
});

// Endpoint to get configurations by table name
app.get("/config/:tableName", async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const request = new sql.Request();
        const { tableName } = req.params;
        const query = `SELECT TOP 1 * FROM ${tableName} ORDER BY id DESC`;
        const response = await request.query(query);
        const result = response.recordset[0];
        console.log(result);
        const { id, candidatenames, pins, grouppins } = result;
        res.send(`${id} , ${candidatenames}, ${pins}, ${grouppins}`);
    } catch (err) {
        res.send(`FAILED TO GET ${err.message}`);
    }
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Listening on port ${PORT}`);
});
