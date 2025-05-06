const jwt = require('jsonwebtoken')
require('dotenv').config()

exports.verifyToken = function (token) {
    try{
        return jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if(err) {
                throw err
            }
            return decoded
        })
    }catch (err) {
        throw err
    }
}