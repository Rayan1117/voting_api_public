const {verifyToken} = require('./verify_token')

exports.verifyRole = function(requiredRole) {
   return function (req, res, next)
    {
        try {
            const header = req.headers['authorization'] ?? ''

    if(!header){
        throw new Error('authorization header is required')
    }

            if (!header.startsWith('Bearer ')) {
                throw new Error("Not a valid bearer token")
            }

            const token = header.split(' ')[1]

            console.log(token)

            const role = verifyToken(token).role

            if (role !== requiredRole) {
                throw new Error(`No other than ${requiredRole} can access this route`)
            }
            next()

        } catch (err) {
            return res.status(400).json({error: err.message})
        }
    }
}