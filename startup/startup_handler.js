const express = require('express');
const startupRoute = express.Router();
let db = require('../database');
const { getVoteIndice, isAllCanidatesSelected } = require("../ProcessMemory/voteMemo")
const { verifyRole } = require("../authorization/verify_role")  
const sql = require("mssql")

startupRoute.use(verifyRole("admin"))

startupRoute.get('/get-config', async (req, res) => {
    try {

        const { espId } = req.query
        const { username } = req;

        const query = `
      SELECT pin_bits, group_pins, group_names, e.candidates as candidate_names
      FROM config c
      JOIN election e ON e.config_id = c.config_id
      WHERE esp_id=@username AND isCurrent = 1
    `;

        const pins = await new db().execQuery(query, {
            "username": {
                "type": sql.VarChar,
                "value": username
            }
        }).then(r => r[0]);

        console.log("configs :",pins);

        if (!pins) throw new Error('No results found', {code: 404});

        const cachedVotesRaw = await getVoteIndice(espId);
        console.log("cached votes:", cachedVotesRaw);

        const cachedVotes = cachedVotesRaw ?? [];
        
        return res.status(200).json({
            ...pins,
            cached_votes: cachedVotes
        });

    } catch (err) {
        console.log(err.message);
        return res.status(err.code || 400).json({ error: err.message });
    }
});

startupRoute.get("/vote-status", async (req, res) => {
    try {
        const { espId } = req.query
        const { username } = req

        const flag = await isAllCanidatesSelected(username, espId)

        return res.status(200).json({ flag })

    } catch (err) {
        console.log(err.message);
        return res.status(400).json({ error: err.message });
    }
})

module.exports = { startupRoute };
