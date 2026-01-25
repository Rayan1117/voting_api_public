const express = require('express')
const configRoute = express.Router()
const { v4: uuidV4 } = require("uuid");
const createConfigIfNotExists = require('../services/create_config');
const db = require('../database');
const sql = require('mssql');
const { verifyRole } = require("../authorization/verify_role");


configRoute.use(verifyRole("admin"))

configRoute.post("/create-config", async (req, res) => {
    const { name , pins, grouppins, groupNames } = req.body;
    
    try {

        await createConfigIfNotExists();

        const id = uuidV4()

        const pinsstring = JSON.stringify(pins);
        const grpstring = JSON.stringify(grouppins);

        const query = `INSERT INTO config (config_name, config_id, pin_bits, group_pins, group_names) VALUES (@name, @id, @pins, @grouppins, @group_names)`;
        await new db().execQuery(query, {
            "name": {
                "type": sql.VarChar,
                "value": name
            },
            "id": {
                "type": sql.VarChar,
                "value": id
            },
            "pins": {
                "type": sql.NVarChar,
                "value": pinsstring
            },
            "grouppins": {
                "type": sql.NVarChar,
                "value": grpstring
            },
            "group_names": {
                "type": sql.NVarChar,
                "value": JSON.stringify(groupNames)
            },
        });

        res.status(201).json({ "message": "configuration created successfully", "config_id": id });
    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }
});

module.exports = configRoute