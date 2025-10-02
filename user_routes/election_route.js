const express = require('express');
const userElectionRoute = express.Router();
const db = require('../database')
const sql = require('mssql');
const { groupAndSumVotes } = require("../services/count_vote");
const { verifyRole } = require('../authorization/verify_role')

userElectionRoute.use(verifyRole('user|admin'))

userElectionRoute.get('/get-all-elections', async (req, res) => {
    try {

        const { election_id } = req.query;

        console.log(election_id);
        

        const query = !election_id ? "SELECT * FROM election LEFT JOIN config ON election.config_id = config.config_id" : "SELECT * FROM election LEFT JOIN config ON election.config_id = config.config_id WHERE election.election_id = @election_id";
        
        const elections = await new db().execQuery(query, !election_id ? null : {
            "election_id": {
                "type": sql.VarChar,
                "value": election_id
            }
        })

        console.log(elections)

        if (elections.length === 0) {
            return res.status(404).json({ "error": "No elections found" })
        }


        return res.status(200).json(!election_id ? elections : { "election_config": elections[0] })

    } catch (err) {
        return res.status(400).json({ "error": err.message });
    }
})

userElectionRoute.get('/get-vote-count/:electionId', async (req, res) => {
    try {
        const { electionId } = req.params;

        const query = `
        SELECT 
            v.vote_count,
            e.election_name,
            e.candidates,
            c.group_pins,
            c.pin_bits
        FROM vote_counts v
        JOIN election e ON e.election_id = v.election_id
        JOIN config c ON c.config_id = e.config_id
        WHERE v.election_id = @election_id
        `;

        const result = await new db().execQuery(query, {
            "election_id": { type: sql.VarChar, value: electionId }
        });

        console.log(result);
        

        if (result.length === 0) {
            return res.status(404).json({ error: 'No vote data found' });
        }

        return res.status(200).json(result);

    } catch (err) {
        console.error("get-vote-count error:", err);
        return res.status(400).json({ error: err.message });
    }
});


module.exports = {
    userElectionRoute
}