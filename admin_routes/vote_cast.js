const express = require('express')
const db = require('../database')
const sql = require('mssql')

const voteCast = async function (electionId, voteArr) {
    try {

        const query = "SELECT vote_count as currVotes FROM vote_counts WHERE election_id = @electionId"

        let {currVotes} = (await new db().execQuery(query, {
            "electionId": {
                "type": sql.NVarChar,
                "value": electionId
            }
        }))[0]

        currVotes = JSON.parse(currVotes)

        if (voteArr === undefined || voteArr.length == 0) {
            throw new Error("candidate index for the vote casting not found")
        }

        console.log("curr votes:", currVotes);

        for (const i of voteArr) currVotes[i]++;
        
        currVotes = JSON.stringify(currVotes)

        console.log(`Election ID: ${electionId}`)
        console.log("Updated vote_count:", currVotes)

        await new db().execQuery(
            "UPDATE vote_counts SET vote_count = @vote_count WHERE election_id = @election_id",
            {
                "vote_count": { type: sql.VarChar, value: currVotes },
                "election_id": { type: sql.VarChar, value: electionId }
            }
        )

        return currVotes
    } catch (err) {
        throw err
    }
}

module.exports = {
    voteCast
}
