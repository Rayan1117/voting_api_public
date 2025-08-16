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

            let role = verifyToken(token).role

            if(requiredRole === 'user|admin') {
                role = requiredRole
            }

            if (role !== requiredRole) {
                throw new Error(`No other than ${requiredRole} can access this route`)
            }
            
            next()

        } catch (err) {
            return res.status(400).json({error: err.message})
        }
    }
}

exports.verifySocketRole = function(requiredRole) {
    return function (socket, next) {
        const token = socket.handshake.auth.token
        console.log("token : ", token);
        
        if (!token) {
            return next(new Error("NO_TOKEN_FOUND"))
        }
        const payload = verifyToken(token.split(" ")[1])

        if(requiredRole === "user|admin") {
            payload.role = requiredRole
        }

        console.log(payload.role);

        if (payload.role === requiredRole) {
            
            return next()
        }
        return next(new Error("INVALID_TOKEN"))
    }
}