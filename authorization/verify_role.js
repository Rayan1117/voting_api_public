const { verifyToken } = require('./verify_token')

exports.verifyRole = function (requiredRole) {
    return function (req, res, next) {
        try {
            
            const header = req.headers['authorization'] ?? ''

            if (!header) {
                throw new Error('authorization header is required')
            }

            if (!header.startsWith('Bearer ')) {
                throw new Error("Not a valid bearer token")
            }

            const token = header.split(' ')[1]

            console.log(token)

            let role = verifyToken(token).role

            if (requiredRole === 'user|admin') {
                role = requiredRole
            }

            if (role !== requiredRole) {
                throw new Error(`No other than ${requiredRole} can access this route`)
            }

            next()

        } catch (err) {
            return res.status(400).json({ error: err.message })
        }
    }
}

exports.verifySocketRole = function (requiredRole) {
  return function (socket, next) {
    console.log("hi");
    
    const authHeader =
      socket.handshake.auth?.token || // v4 clients (browser)
      socket.handshake.headers["authorization"] || // ESP headers
      socket.handshake.query?.token; // <--- add query token support

    console.log("Auth Header or Query Token:", authHeader);

    if (!authHeader) return next(new Error("NO_TOKEN_FOUND"));

    // If query param provided, don’t split by space
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

    let payload;
    try {
      payload = verifyToken(jwt);
    } catch (err) {
      return next(new Error("INVALID_TOKEN"));
    }

    console.log("Payload role:", payload.role);

    if (requiredRole.includes(payload.role)) {
      return next();
    }

    return next(new Error("INVALID_TOKEN"));
  };
};
