const express = require('express')
const voteRoute = express.Router()
const db = require('../database')
const sql = require('mssql')
const { getVoteIndex, deleteVoteIndex, vote } = require('../ProcessMemory/voteMemo')

const voteCast = async function(electionId, espId) {
    try {

        console.log(electionId);

        const query = "SELECT vote_count FROM vote_counts WHERE election_id = @election_id"

        let { vote_count } = await new db().execQuery(query, {
            "election_id": {
                "type": sql.VarChar,
                "value": electionId
            }
        }).then(result => result[0])

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

        return 1


    } catch (err) {
        throw err
    }
}

module.exports = {
    voteCast
}