const express = require('express')
const voteRoute = express.Router()
const db = require('../database')
const sql = require('mssql')
const { getVoteIndex, deleteVoteIndex, vote } = require('../ProcessMemory/voteMemo')

const voteCast = async function(electionId, espId) {
    try {

        console.log(electionId);

        const query = "SELECT web_utilities.cast_flag, vote_counts.vote_count FROM web_utilities JOIN vote_counts ON web_utilities.election_id = vote_counts.election_id WHERE web_utilities.election_id = @election_id"

        let { cast_flag, vote_count } = await new db().execQuery(query, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        }).then(result => result[0])

        console.log(cast_flag, JSON.parse(vote_count));

        if (!cast_flag) {
            throw new Error("candidate should be selected")
        }


        vote_count = JSON.parse(vote_count)

        const index = getVoteIndex(espId)

        console.log(index);

        if(!index){
            throw new Error("index for the vote casting not found")
        }

        vote_count[index]++

        vote_count = JSON.stringify(vote_count)

        console.log(vote_count);

        await new db().execQuery("UPDATE vote_counts SET vote_count = @vote_count WHERE election_id = @election_id",
            {
                "vote_count": {
                    "type": sql.NVarChar,
                    "value": vote_count
                },
                "election_id": {
                    "type": sql.VarChar,
                    "value": electionId
                }
            }
        )

        deleteVoteIndex(espId)

        await new db().execQuery("UPDATE web_utilities SET cast_flag = 0 WHERE election_id = @election_id",
            {
                "election_id": {
                    "type": sql.VarChar,
                    "value": electionId
                }
            }
        )

        return 1


    } catch (err) {
        return res.status(400).json({ "error": err.message })
    }
}

module.exports = {
    voteCast
}