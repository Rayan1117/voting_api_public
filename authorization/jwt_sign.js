const jwt = require('jsonwebtoken')
require('dotenv').config()

exports.signJWT =  function(role) {
    try{
        return jwt.sign({role}, process.env.JWT_SECRET, {expiresIn: '24h'});
    }catch (err) {
        throw err
    }
}