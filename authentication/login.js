const express = require('express')
const loginRouter = express.Router()
const db = require('../database')
const {signJWT} = require('../authorization/jwt_sign')
const sql = require('mssql')

loginRouter.post('/login', async (req, res) => {
    try{
        const {username, password} = req.body

        if(!username || !password) {
            throw new Error('EVM id and Password must not be empty')
        }

        const query = "SELECT role FROM users WHERE username = @username AND password = @password";

        const result = await new db().execQuery(query, {
            "username": {
                "type": sql.VARCHAR,
                "value": username,
            },
            "password": {
                "type": sql.VARCHAR,
                "value": password,
            }
        }).then(result => result[0])

        if(!result) {
            throw new Error('id or password may be incorrect')
        }

        console.log(result)

        const role = result.role

        const token = signJWT(role)

        if(!token) {
            throw new Error('Invalid token')
        }

        return res.status(200).json({"message": "Successfully logged in", "token": token, role})

    }catch (err) {
        return res.status(400).json({error: err.message})
    }
})

module.exports = {loginRouter}