const jwt = require('jsonwebtoken')
require('dotenv').config()

exports.signJWT =  function(role, username) {
    try{    
        return jwt.sign({role, username}, process.env.JWT_SECRET, {expiresIn: '1w'});
    }catch (err) {
        throw err
    }
}