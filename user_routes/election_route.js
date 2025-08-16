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
        const { electionId } = req.params

        console.log(electionId);
        

        const query = `SELECT * FROM vote_counts
         JOIN election ON election.election_id = vote_counts.election_id
          JOIN config ON config.config_id = election.config_id WHERE vote_counts.election_id = @election_id`;

          
        const vote_counts = await new db().execQuery(query, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        })

        console.log(vote_counts);
        
        

        const vote = JSON.parse(vote_counts[0]?.vote_count ?? "[]")
        

        const group_indices = JSON.parse(vote_counts[0]?.group_pins ?? "[]")
        

        const groupedVoteCount = groupAndSumVotes(vote, group_indices)

        if (vote_counts.length === 0) {
            throw new Error('No vote count found')
        }

        return res.status(200).json(vote_counts)

    } catch (err) {
        console.log(err);
        
        return res.status(400).json({ "error": err.message });
    }
})

module.exports = {
    userElectionRoute
}