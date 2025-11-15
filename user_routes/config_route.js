const express = require("express")
const { verifyRole } = require("../authorization/verify_role")
const userConfigRoute = express.Router()
const db = require("../database")

userConfigRoute.use(verifyRole("user|admin"))

userConfigRoute.get("/get-all-configs", async (req, res) => {
    
    const query = "SELECT * FROM config"
    const configs = await new db().execQuery(query)

    if(configs.length > 0) {
        return res.status(200).json({"configs": configs})
    }

    return res.status(404).json({"message": "no configs found"})
})

module.exports = userConfigRoute