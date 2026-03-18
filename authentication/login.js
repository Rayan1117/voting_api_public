const express = require('express')
const loginRouter = express.Router()
const db = require('../database')
const { signJWT } = require('../authorization/jwt_sign')
const sql = require('mssql')

loginRouter.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing credentials' })
    }

    const query = `
      SELECT * FROM election_users
      WHERE username = @username
      AND password = @password
      AND role = @role
    `

    const result = await new db().execQuery(query, {
      username: { type: sql.VARCHAR(50), value: username },
      password: { type: sql.VARCHAR(255), value: password },
      role: { type: sql.VARCHAR(10), value: role }
    })

    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result[0]

    const token = signJWT(user.role, user.esp_id)

    return res.status(200).json({
      message: 'Successfully logged in',
      token,
      role: user.role,
      esp_id: user.esp_id
    })

  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = { loginRouter }
