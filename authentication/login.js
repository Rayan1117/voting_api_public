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

    const table = role === 'admin' ? 'election_admins' : 'election_users'
    const column = role === 'admin' ? 'esp_id' : 'username'

    const query = `
      SELECT * FROM ${table}
      WHERE ${column} = @username
      AND password = @password
    `

    const result = await new db().execQuery(query, {
      username: {
        type: role === 'admin' ? sql.VARCHAR(20) : sql.VARCHAR(50),
        value: username,
      },
      password: {
        type: sql.VARCHAR(255),
        value: password,
      }
    })

    console.log(result);
    

    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signJWT(role, username)

    return res.status(200).json({
      message: 'Successfully logged in',
      token,
      role
    })

  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = { loginRouter }
