const express = require('express')
const electionRoute = express.Router()
const { v4: uuidV4 } = require("uuid")
const createElectionIfNotExist = require('../services/create_election');
const sql = require('mssql');
const db = require('../database');
const { getSocket } = require('../ProcessMemory/espToSocketMap');
const { verifyRole } = require("../authorization/verify_role");
const { deleteVoteIndice } = require('../ProcessMemory/voteMemo');

electionRoute.use(verifyRole("admin"))

electionRoute.post('/create-election', async (req, res) => {
    try {
        console.log("username :", req.username);

        const { candidates, electionName, configId } = req.body

        await createElectionIfNotExist()

        const election_id = uuidV4()

        const query = `INSERT INTO election (election_id, election_name, config_id, candidates, esp_id)
                            VALUES(@e_id, @e_name, @config_id, @candidates, @username)`

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
            "username": {
                "type": sql.VarChar,
                "value": req.username
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
        const { electionId, espId } = req.body;

        console.log(espId);

        if (!electionId) {
            throw new Error("election id field is required");
        }

        const query = `
      SELECT 
        election.isCurrent, 
        election.isEnd, 
        election.config_id, 
        election.candidates, 
        config.pin_bits, 
        config.group_pins, 
        config.group_names
      FROM election 
      LEFT JOIN config ON config.config_id = election.config_id 
      WHERE election_id = @election_id
    `;

        const countQuery = "SELECT SUM(CAST(isCurrent AS INT)) AS count FROM election WHERE esp_id = @username";

        const result = await new db().execQuery(query, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        });

        if (result.length === 0) {
            throw new Error("Election not found");
        }

        const count = await new db()
            .execQuery(countQuery, {
                "username": {
                    "type": sql.VarChar,
                    "value": req.username
                }
            })
            .then(data => data[0]['count']);

        const { isEnd } = result[0];

        if (count) {
            console.log(count);

            throw new Error("there is already an election currently ongoing");
        }
        if (isEnd) {
            console.log(isEnd);

            throw new Error("this election has already ended");
        }

        console.log("espId:", espId);

        const socket = getSocket(espId);

        if (!socket) {
            throw new Error("socket for the esp id not found");
        }

        socket.emit("change-config", {
            pin_bits: JSON.parse(result[0].pin_bits),
            group_pins: JSON.parse(result[0].group_pins),
            group_names: result[0].group_names || "{}",
            candidate_names: result[0].candidates || "[]"
        });

        const timeout = setTimeout(() => {
            return res.status(408).json({
                "error": "timed out receiving confirmation from the client"
            });
        }, 2000);

        socket.once('config-changed', async (response) => {
            try {
                console.log("Received confirmation from the client:", response);
                clearTimeout(timeout);

                const updateQuery =
                    "UPDATE election SET isCurrent = 1 WHERE election_id = @election_id";

                await new db().execQuery(updateQuery, {
                    "election_id": {
                        "type": sql.VarChar,
                        "value": electionId
                    }
                });

                const startVoteQuery =
                    "INSERT INTO vote_counts(election_id) VALUES(@election_id)";

                await new db().execQuery(startVoteQuery, {
                    "election_id": {
                        "type": sql.VarChar,
                        "value": electionId
                    }
                });

                deleteVoteIndice(req.username)

                return res.send("Election Started Successfully");
            } catch (err) {
                throw err;
            }
        });

    } catch (err) {
        return res.status(400).json({ "error": err.message });
    }
});


electionRoute.post("/resume-election", async (req, res) => {
    try {
        const { electionId, espId } = req.body;

        if (!electionId) {
            throw new Error("election id field is required");
        }

        const query = `
            SELECT e.isCurrent, e.isEnd, e.config_id, c.pin_bits, c.group_pins, vc.vote_count
            FROM election AS e
            LEFT JOIN config AS c ON c.config_id = e.config_id LEFT JOIN vote_counts AS vc ON vc.election_id = e.election_id
            WHERE e.election_id = @election_id
        `;

        const result = await new db().execQuery(query, {
            "election_id": { type: sql.VarChar, value: electionId }
        });

        if (result.length === 0) {
            throw new Error("Election not found");
        }

        const { isCurrent, isEnd } = result[0];

        if (!isCurrent) {
            throw new Error("Election is not currently running, please start it first.");
        }
        if (isEnd) {
            throw new Error("This election has already ended");
        }

        return res.json({
            message: "Election resumed successfully",
            electionId,
            config: { pin_bits: JSON.parse(result[0].pin_bits) }
        });

    } catch (err) {
        console.error("Resume election error:", err.message);
        return res.status(400).json({ error: err.message });
    }
});


electionRoute.post("/end-election", async (req, res) => {
    try {

        const { electionId } = req.body

        const query = "UPDATE election SET isEnd = 1, isCurrent = 0 WHERE election_id = @election_id"

        await new db().execQuery(query, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        })

        deleteVoteIndice(req.username)

        return res.status(200).send("Election ends")
    } catch (err) {
        return res.status(400).json({ "error": err.message })
    }
})
electionRoute.delete("/delete-election", async (req, res) => {
    try {
        const { electionId } = req.query;

        if (!electionId) {
            return res.status(400).json({ error: "Election ID required" });
        }

        const getQuery = `
      SELECT isCurrent, config_id
      FROM election
      WHERE election_id = @election_id
    `;

        const result = await new db().execQuery(getQuery, {
            election_id: { type: sql.VarChar, value: electionId }
        });

        if (result.length === 0) {
            throw new Error("Election not found");
        }

        if (result[0].isCurrent) {
            throw new Error("Ongoing election: Finalize before deleting");
        }


        await new db().execQuery(
            "DELETE FROM vote_counts WHERE election_id = @election_id",
            { election_id: { type: sql.VarChar, value: electionId } }
        );


        await new db().execQuery(
            "DELETE FROM election WHERE election_id = @election_id",
            { election_id: { type: sql.VarChar, value: electionId } }
        );


        await new db().execQuery(
            "DELETE FROM config WHERE config_id = @config_id",
            { config_id: { type: sql.VarChar, value: result[0].config_id } }
        );

        return res.sendStatus(204);

    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});


module.exports = electionRoute