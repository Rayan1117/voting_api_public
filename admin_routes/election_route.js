const express = require('express')
const electionRoute = express.Router()
const { v4: uuidV4 } = require("uuid")
const createElectionIfNotExist = require('../services/create_election');
const sql = require('mssql');
const db = require('../database');
const { getSocket } = require('../ProcessMemory/espToSocketMap');
const { verifyRole } = require("../authorization/verify_role");

electionRoute.use(verifyRole("admin"))

electionRoute.post('/create-election', async (req, res) => {
    try {
        const { candidates, electionName, configId } = req.body

        console.log(typeof candidates, electionName, configId);


        console.log(electionName)

        await createElectionIfNotExist()

        const election_id = uuidV4()

        const query = `INSERT INTO election (election_id, election_name, config_id, candidates)
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

electionRoute.post("/start-election", async (req, res) => {
    try {
        const { electionId, espId } = req.body

        if (!electionId) {
            throw new Error("election id field is required")
        }

        const query = "SELECT election.isCurrent, election.isEnd, election.config_id, config.pin_bits, config.group_pins FROM election LEFT JOIN config ON config.config_id = election.config_id WHERE election_id = @election_id"

        const countQuery = "SELECT SUM(CAST(isCurrent AS INT)) AS count FROM election"

        const result = await new db().execQuery(query, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        })

        if (result[0]["config_id"] === null) {
            throw new Error("set the configurations before starting election")
        }

        const count = await new db().execQuery(countQuery).then(data => data[0]['count'])

        if (result.length === 0) {
            throw new Error("Election Not found")
        }

        console.log(result)

        const { pin_bits, isEnd } = result[0]

        if (count) {
            throw new Error("there is already an election currently ongoing")
        }
        if (isEnd) {
            throw new Error("this election has already ended")
        }

        const socket = getSocket(espId)

        if (!socket) {
            throw new Error("socket for the esp id not found")
        }

        socket.emit("change-config", {
            pin_bits: JSON.parse(result[0].pin_bits),
            group_pins: JSON.parse(result[0].group_pins)
        });


        const timeout = setTimeout(() => {
            return res.status(408).json({ "error": "timed out receiving confirmation from the client" })
        }, 10000)

        socket.once('config-changed', async (response) => {
            try {
                console.log("Received confirmation from the client:", response);
                clearTimeout(timeout)

                const query = "UPDATE election SET isCurrent = 1 WHERE election_id = @election_id"

                await new db().execQuery(query, {
                    "election_id": {
                        "type": sql.VarChar,
                        "value": electionId
                    }
                });

                startVoteQuery = "INSERT INTO vote_counts(election_id) VALUES(@election_id)"

                await new db().execQuery(startVoteQuery, {
                    "election_id": {
                        "type": sql.VarChar,
                        "value": electionId
                    }
                })

                return res.send("Election Started Successfully");
            } catch (err) {
                throw err
            }
        });

    } catch (err) {
        return res.status(400).json({ "error": err.message })
    }
});

// Resume Election (after admin reconnect)
electionRoute.post("/resume-election", async (req, res) => {
    try {
        const { electionId, espId } = req.body;

        console.log(req.body);
        
        if (!electionId) {
            throw new Error("election id field is required");
        }

        // Check if election is still running
        const query = `
            SELECT election.isCurrent, election.isEnd, election.config_id, config.pin_bits, config.group_pins
            FROM election 
            LEFT JOIN config ON config.config_id = election.config_id 
            WHERE election_id = @election_id
        `;

        const result = await new db().execQuery(query, {
            "election_id": { type: sql.VarChar, value: electionId }
        });

        if (result.length === 0) {
            throw new Error("Election not found");
        }

        const { isCurrent, isEnd, pin_bits } = result[0];

        if (!isCurrent) {
            throw new Error("Election is not currently running, please start it first.");
        }
        if (isEnd) {
            throw new Error("This election has already ended");
        }

        // Ensure EVM socket is available
        const socket = getSocket(espId);
        if (!socket) {
            throw new Error("socket for the esp id not found");
        }

        console.log(result);

        // Re-sync EVM with config (optional, in case of lost state)
        socket.emit("change-config", {
            pin_bits: JSON.parse(result[0].pin_bits),
            group_pins: JSON.parse(result[0].group_pins)
        });

        const timeout = setTimeout(() => {
            return res.status(408).json({ error: "Timed out waiting for ESP confirmation" });
        }, 10000);

        socket.once("config-changed", () => {
            clearTimeout(timeout);
            return res.json({
                message: "Election resumed successfully",
                electionId,
                config: { pin_bits: JSON.parse(result[0].pin_bits) }
            });
        });

    } catch (err) {
        console.error("❌ Resume election error:", err.message);
        return res.status(400).json({ error: err.message });
    }
});


electionRoute.post("/end-election", async (req, res) => {
    try {
        console.log(req.query);
        
        const { electionId } = req.body

        console.log(electionId);
        

        console.log(electionId);

        const getQuery = "SELECT * FROM election WHERE election_id = @election_id"

        const { isCurrent } = await new db().execQuery(getQuery, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        }).then(result => result[0])

        if (!isCurrent) {
            throw new Error("this is not an ongoing election")
        }

        const query = "UPDATE election SET isEnd = 1, isCurrent = 0 WHERE election_id = @election_id"

        await new db().execQuery(query, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        })

        return res.status(200).send("Election ends")
    } catch (err) {
        return res.status(400).json({ "error": err.message })
    }
})

module.exports = electionRoute