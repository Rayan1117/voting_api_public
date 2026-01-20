const express = require('express');
const startupRoute = express.Router();
let db = require('../database')

startupRoute.get('/get-config',async function (req, res) {
    try{
        const {espId} = req.query;      //will be used in future when setup separate DB for separate EVM

        const query = "SELECT pin_bits, group_pins FROM config JOIN election ON election.config_id = config.config_id WHERE election.isCurrent = 1"

        const pins = await new db().execQuery(query).then(result => result[0])

        console.log(pins)

        if(!pins) {
            throw new  Error('No results found')
        }

        return res.status(200).json(pins)

    }catch(err) {
        console.log(err.message)
        return res.status(400).json({"error": err.message});
    }
})

module.exports = { startupRoute };