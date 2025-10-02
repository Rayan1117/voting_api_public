const express = require('express')
const db = require('../database')
const sql = require('mssql')

const voteCast = async function(electionId, espId, group, candidateIndex) {
    try {
        // Fetch current vote counts
        const query = "SELECT vote_count FROM vote_counts WHERE election_id = @election_id"
        let { vote_count } = await new db().execQuery(query, {
            "election_id": { type: sql.VarChar, value: electionId }
        }).then(result => result[0])

        vote_count = JSON.parse(vote_count) // e.g., [0,0,0,0,0,0,0,0]

        if (candidateIndex === null || candidateIndex === undefined) {
            throw new Error("candidate index for the vote casting not found")
        }

        // Increment vote for the selected candidate
        vote_count[candidateIndex]++

        console.log(`Election ID: ${electionId}`)
        console.log(`Group ${group} voted for candidate ${candidateIndex}`)
        console.log("Updated vote_count:", vote_count)

        // Update DB
        await new db().execQuery(
            "UPDATE vote_counts SET vote_count = @vote_count WHERE election_id = @election_id",
            {
                "vote_count": { type: sql.NVarChar, value: JSON.stringify(vote_count) },
                "election_id": { type: sql.VarChar, value: electionId }
            }
        )

        return 1
    } catch (err) {
        throw err
    }
}

module.exports = {
    voteCast
}
