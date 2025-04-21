const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const http = require("http");
const socketIo = require("socket.io");
const os = require("os")
const db = require('./database')
const { v4: uuidV4 } = require("uuid")

const socketToEspID = new Map()

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


const createConfigIfNotExists = async () => {
    try {
        const createTableQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = config)
            BEGIN
            CREATE TABLE config (
                config_id VARCHAR(36) PRIMARY KEY,
                pin_bits NVARCHAR(36) NOT NULL,
                group_pins NVARCHAR(36) NOT NULL
            );
            END
        `;
        await new db().execQuery(createTableQuery);
        console.log(`Table config created or already exists.`);
    } catch (err) {
        console.log("Error creating table:", err);
    }
};

const createElectionIfNotExist = async () => {
    try {
        const query = `
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = election)
        BEGIN
        CREATE TABLE election (
            election_id VARCHAR(36) PRIMARY KEY,
            election_name NVARCHAR(255) UNIQUE NOT NULL,
            config_id VARCHAR(36),
            FOREIGN KEY (config_id) REFERENCES config(config_id)
        );
        END
    `;
        await new db().execQuery(query)
        console.log(`Table election created or already exists.`);
    } catch (err) {
        console.log("Error creating table:", err);
    }
}

io.on('connection', (socket) => {

    console.log(socket.id);

    socket.on("post-connection", (data) => {
        console.log(data.id);
        socketToEspID.set(data.id, socket.id)
    })

    socket.on("message", (data) => {
        console.log(data);
    })

    socket.on('pre-disconnect', (data) => {
        socketToEspID.delete(data.id)
    })

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});


app.post("/set-config", async (req, res) => {
    const { espID, pins, grouppins } = req.body;

    try {

        await createConfigIfNotExists("config");

        const id = uuidV4()
        console.log(id);

        const pinsstring = JSON.stringify(pins);
        const grpstring = JSON.stringify(grouppins);

        const query = `INSERT INTO config (config_id, pin_bits, group_pins) VALUES (@id, @pins, @grouppins)`;
        await new db().execQuery(query, {
            "id": {
                "type": sql.VarChar,
                "value": id
            },
            "pins": {
                "type": sql.NVarChar,
                "value": pinsstring
            },
            "grouppins": {
                "type": sql.NVarChar,
                "value": grpstring
            }
        });

        let socketID = socketToEspID.get(espID)

        io.to(socketID).emit('data', { id, pinsstring });

        res.send({ id, pins, grouppins });
    } catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    }
});

app.post('/create-election', async (req, res) => {
    try {
        const { candidates, electionName, configId } = req.body

        await createElectionIfNotExist()

        const election_id = uuidV4()

        const query = `INSERT INTO election(election_id, election_name, config_id, candidates)
                        VALUES(@e_id, @e_name, @config_id, @candidates)`

        await new db().execQuery(query, {
            "e_id": {
                "type": sql.VarChar,
                "value": election_id
            },
            "e_name": {
                "type": sql.NVarChar,
                "value": electionName
            },
            "config_id": {
                "type": sql.VarChar,
                "value": configId
            },
            "candidates": {
                "type": sql.NVarChar,
                "value": candidates
            },
        })

        return res.status(201).json({
            "message": `election created successfully ${election_id}`
        })

    } catch (err) {
        return res.status(400).json({ "error": err.message })
    }
})

app.post("/start-election", async (req, res) => {
    try {
        const {electionId} = req.body  
        
        

    } catch (err) {

    }
})

app.post("/cast-vote", async (req, res) => {
    try {

    } catch (err) {

    }
})

server.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();

    Object.keys(networkInterfaces).forEach((iface) => {
        networkInterfaces[iface].forEach((details) => {
            if (details.family === 'IPv4' && !details.internal) {
                console.log(`Server running at http://${details.address}:${PORT}/`);
            }
        });
    });
});
