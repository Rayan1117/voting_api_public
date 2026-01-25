const express = require('express')
const adminRoute = express.Router()
const db = require('../../database')
const sql = require('mssql')

adminRoute.post('/create-account', async (req, res) => {
  try {
    const { adminPassword, type, username, password } = req.body

    if (!adminPassword || !type || !username || !password) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const adminAuthQuery = `
      SELECT username
      FROM election_users
      WHERE username = 'ADMIN' AND password = @password
    `

    const adminResult = await new db().execQuery(adminAuthQuery, {
      password: { type: sql.VARCHAR(255), value: adminPassword }
    })

    if (adminResult.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (type === 'admin') {
      await new db().execQuery(
        `INSERT INTO election_admins (esp_id, password)
         VALUES (@esp_id, @password)`,
        {
          esp_id: { type: sql.VARCHAR(20), value: username },
          password: { type: sql.VARCHAR(255), value: password }
        }
      )
    } else {
      await new db().execQuery(
        `INSERT INTO election_users (username, password, esp_id)
         VALUES (@username, @password, NULL)`,
        {
          username: { type: sql.VARCHAR(50), value: username },
          password: { type: sql.VARCHAR(255), value: password }
        }
      )
    }

    return res.status(201).json({ message: `${type} created successfully` })

  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
})

module.exports = { adminRoute }