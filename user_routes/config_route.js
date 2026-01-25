const express = require("express")
const { verifyRole } = require("../authorization/verify_role")
const userConfigRoute = express.Router()
const db = require("../database")
const sql = require("mssql")

userConfigRoute.use(verifyRole("user|admin"))

userConfigRoute.get("/get-all-configs", async (req, res) => {
  try {
    const query = `
      SELECT c.*
      FROM election e
      JOIN config c ON c.config_id = e.config_id
      WHERE e.esp_id = @username
    `

    const configs = await new db().execQuery(query, {
      username: {
        type: sql.VarChar,
        value: req.username
      }
    })

    if (configs.length > 0) {
      return res.status(200).json({ configs })
    }

    return res.status(404).json({ message: "no configs found" })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

module.exports = userConfigRoute
