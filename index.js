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
        const espId = data.espId
        console.log(`Election ${espId} started`);

        socket.join(espId);

        io.to(espId).emit('election-started', espId);
    });

    socket.on('cast-vote', async ({ espId, electionId }) => {
        try {
            const voteIndex = getVoteIndex(espId);
            console.log(`Vote received for election ${electionId} - index ${voteIndex}`);

            await voteCast(electionId, espId).catch(err => { throw err });

            io.to(espId).emit('vote-updated', { voteIndex });
        } catch (err) {
            console.log(err.message);
        }
    });

    socket.on("vote-selected", async ({ espId, voteIndex }) => {
        try {
            console.log(espId, voteIndex);

            const roomName = espId;
            const room = io.sockets.adapter.rooms[roomName];

            const count = room ? room.length : 0;

            if(count !== 2){
                throw new Error("EVM or App got disconnected!")
            }

            addVoteIndex(espId, voteIndex);

            io.to(espId).emit("vote-selected", voteIndex);
        } catch (err) {
            console.log(err.message);
        }
    });
});

app.use('/election', electionRoute);
app.use('/config', configRoute);

server.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    Object.keys(networkInterfaces).forEach((iface) => {
        networkInterfaces[iface].forEach((details) => {
            if (details.family === 'IPv4' && !details.internal) {
                console.log(`Server running at http://${details.address}:${PORT}/`);
            }
        });
    });
});
