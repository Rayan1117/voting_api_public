const express = require('express')
const voteRoute = express.Router()
const db = require('../database')
const sql = require('mssql')
const {getVoteIndex, vote} = require('../ProcessMemory/voteMemo')

voteRoute.post("/cast-vote", async (req, res) => {
    try {
        const {electionId, espId} = req.body

        console.log(electionId);
        

        const query = "SELECT web_utilities.cast_flag, vote_counts.vote_count FROM web_utilities JOIN vote_counts ON web_utilities.election_id = vote_counts.election_id WHERE web_utilities.election_id = @election_id"

        const {cast_flag, vote_count} = await new db().execQuery(query, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        }).then(result => result[0])

        console.log(cast_flag, typeof JSON.parse(vote_count));

        if(!cast_flag){
            throw new Error("candidate should be selected")
        }

        

    } catch (err) {
        return res.status(400).json({ "error": err.message })
    }
})

module.exports = {
    voteRoute
}