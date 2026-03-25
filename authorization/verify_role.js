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

            let { role, username } = verifyToken(token)

            if (requiredRole === 'user|admin') {
                role = requiredRole
            }

            if (role !== requiredRole) {
                throw new Error(`No other than ${requiredRole} can access this route`)
            }

            req.username = username

            next()

        } catch (err) {
            return res.status(400).json({ error: err.message })
        }
    }
}

exports.verifySocketRole = function (requiredRole = []) {
  return function (socket, next) {

    const authHeader =
      socket.handshake.auth?.token ||
      socket.handshake.headers["authorization"] ||
      socket.handshake.query?.token;

    console.log("Auth Header:", authHeader);

    if (!authHeader) return next(new Error("NO_TOKEN_FOUND"));

    const jwt = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : authHeader;

    console.log("JWT:", jwt);

    try {
      const payload = verifyToken(jwt);

      console.log("Payload:", payload);

      if (!Array.isArray(requiredRole) || requiredRole.length === 0) {
        return next(); // allow all
      }

      if (requiredRole.includes(payload.role)) {
        socket.username = payload.username;
        socket.role = payload.role;
        return next();
      }

      return next(new Error("INVALID_ROLE"));

    } catch (err) {
      console.log("JWT ERROR:", err.message);
      return next(new Error("INVALID_TOKEN"));
    }
  };
};
