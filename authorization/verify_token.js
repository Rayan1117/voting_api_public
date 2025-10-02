const express = require('express')
const jwt = require('jsonwebtoken')
const tokenVerifyRoute = express.Router()
require('dotenv').config()

tokenVerifyRoute.post("/verify-token", (req, res) => {
    try {
        const { token } = req.body
        this.verifyToken(token)
        console.log("success");
        
        return res.sendStatus(200)
    }
    catch (err) {
        return res.status(403).json({ "error": err.message })
    }
})

exports.tokenVerifyRoute = tokenVerifyRoute

exports.verifyToken = function (token) {
    
    return jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            throw err
        }
        return decoded
    })
}