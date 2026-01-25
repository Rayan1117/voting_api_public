const express = require('express');
const cors = require('cors');
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");
const electionRoute = require('./admin_routes/election_route');
const configRoute = require('./admin_routes/config_route');
const { startupRoute } = require("./startup/startup_handler")
const { loginRouter } = require('./authentication/login')
const { userElectionRoute } = require('./user_routes/election_route')
const { tokenVerifyRoute } = require("./authorization/verify_token");
const { adminSocketContext } = require('./socket_routes/admin_namespace');
const { userSocketContext } = require('./socket_routes/user_namespace');
const userConfigRoute = require('./user_routes/config_route');
const { adminRoute } = require("./admin_routes/special_access_route/creation_route")
const path = require("path")

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    allowEIO3: true,
    cors: {
        credentials: true,
        origin: ["https://hoppscotch.io", "http://localhost:3000", "https://smart-evm-web.onrender.com"],
        methods: ["GET", "POST"],
    }
})

adminSocketContext(io.of("/"), io)
userSocketContext(io.of("/live-election"))

app.get('/test', (req, res) => {
    return res.status(200).send("working properly")
})

const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

app.use('/election', electionRoute);
app.use('/config', configRoute);
app.use('/startup', startupRoute);
app.use('/auth', loginRouter);
app.use('/utils', userElectionRoute);
app.use("/utils", userConfigRoute);
app.use("/verification", tokenVerifyRoute);
app.use("/special-access", adminRoute)
app.use(
    "/special-access/page",
    express.static(path.join(__dirname, "special_route_page"))
)

server.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    Object.keys(networkInterfaces).forEach((IFace) => {
        networkInterfaces[IFace].forEach((details) => {
            if (details.family === 'IPv4' && !details.internal) {
                console.log(`Server running at address ${details.address}:${PORT}/`);
            }
        });
    });
});