const express = require('express')
const configRoute = express.Router()
const { v4: uuidV4 } = require("uuid");
const createConfigIfNotExists = require('../services/create_config');
const db = require('../database');
const sql = require('mssql');
const {getSocket} = require('../ProcessMemory/espToSocketMap')

configRoute.post("/create-config", async (req, res) => {
    const { espID, pins, grouppins } = req.body;

    try {

        await createConfigIfNotExists();

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

        let socket = getSocket(espID)

        socket.emit('data', { id, pinsstring });

        res.send({ id, pins, grouppins });
    } catch (err) {
        console.log(err);
        res.status(500).send(err.message);
    }
});


configRoute.post('/set-config', async (req, res) => {
    try {
        const { electionId, configId } = req.body

        if (!electionId && !configId) {
            throw new Error("election id and config id must be defined in the request body")
        }

        const query = "UPDATE election SET config_id = @config_id WHERE election_id = @election_id"

        await new db().execQuery(query,
            {
                "election_id": {
                    "type": sql.VarChar,
                    "value": electionId
                },
                "config_id": {
                    "type": sql.VarChar,
                    "value": configId
                }
            }
        )
        return res.status(200).send("configurations set successfully")

    } catch (err) {
        return res.status(err.code || 400).json({ "error": err.message })
    }
})


module.exports = configRoute