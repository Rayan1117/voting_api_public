const express = require('express');
const cors = require('cors');
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");
const electionRoute = require('./routes/election_route');
const configRoute = require('./routes/config_route');
const { addSocket, removeSocket } = require('./ProcessMemory/espToSocketMap');
const { voteCast } = require('./routes/vote_cast');
const { addVoteIndex, getVoteIndex } = require('./ProcessMemory/voteMemo');
const {isInitialized, arePresent, addPresence, resetPresence} = require("./ProcessMemory/presenceMap")
const {startupRoute} = require("./startup/startup_handler")
const {loginRouter} = require('./authentication/login')

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        transports: ['websocket'],
        allowEIO3: true,
        origin: ["https://hoppscotch.io", "http://localhost:3000", "*"],
        methods: ["GET", "POST"]
    }
});

app.get('/test', (req, res) => {
    return res.status(200).send("working properly")
})

const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
    console.log(socket.id);

    socket.on("post-connection", (data) => {
        console.log(data.id);
        const espID = data.id;
        addSocket(espID, socket);
    });

    socket.on("message", (data) => {
        console.log(data);
    });

    socket.on('pre-disconnect', (data) => {
        removeSocket(JSON.parse(data).id);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    socket.on('start-election', (data) => {
        const { espId }= data
        console.log(`Election ${espId} started`);

        socket.join(espId);

        io.to(espId).emit('election-started', espId);
    });

    socket.on('cast-vote', async ({ espId, electionId }) => {
        try {
            const voteIndex = getVoteIndex(espId);
            console.log(`Vote received for election ${electionId} - index ${voteIndex}`);

            await voteCast(electionId, espId, voteIndex).catch(err => { throw err });

            io.to(espId).emit('vote-updated', { voteIndex });
        } catch (err) {
            console.log(err.message);
        }
    });

    socket.on("present", (data) => {
        const { room, role } = data;
        isInitialized(room)
        console.log(room, role)
        addPresence(room, role)
    });

    socket.on("vote-selected", async ({ espId, voteIndex }) => {
        try {
            console.log(espId, voteIndex);

            io.to(espId).emit("check-presence", espId);

            const room = io.sockets.adapter.rooms[espId];

            const count = room ? room.length : 0;

            setTimeout(function()  {
                console.log("executing")
                if(!arePresent(espId)){
                    console.log("presence");
                    resetPresence(espId);
                    io.to(espId).emit("reset-selected","reset request")
                    console.log("EVM or App got disconnected from websocket");
                    return
                }

                addVoteIndex(espId, voteIndex);

                resetPresence(espId)

                io.to(espId).emit("vote-selected", voteIndex);
                console.log("emitted")
            }, 10000)


        } catch (err) {
            resetPresence(espId);
            console.log(err.message);
        }
    });
});

app.use('/election', electionRoute);
app.use('/config', configRoute);
app.use('/startup', startupRoute);
app.use('/auth', loginRouter);

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
