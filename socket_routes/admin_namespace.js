const { addSocket, removeSocket, getSocket } = require('../ProcessMemory/espToSocketMap');
const { voteCast } = require('../admin_routes/vote_cast');
const { addVoteIndex, getVoteIndex } = require('../ProcessMemory/voteMemo');
const { isInitialized, arePresent, addPresence, resetPresence } = require("../ProcessMemory/presenceMap");
const { verifyToken } = require('../authorization/verify_token');
const { verifySocketRole } = require('../authorization/verify_role');

exports.adminSocketContext = function (adminSocket, io) {

    adminSocket.use(verifySocketRole("admin"))

    adminSocket.on('connection', (socket) => {
        console.log(socket.id);

        socket.on("post-connection", (data) => {
            console.log(data.espId);
            const espID = data.espId;
            addSocket(espID, socket);
        });

        socket.on("message", (data) => {
            console.log(data);
            io.of("/live-election").to("election").emit("vote-updated", { voteIndex: 6 })
        });

        socket.on('pre-disconnect', (data) => {
            removeSocket(JSON.parse(data).id);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });

        socket.on('start-election', (data) => {
            const { espId } = data
            console.log(`Election ${espId} started`);

            socket.join(espId);

            adminSocket.to(espId).emit('election-started', espId);
        });

        socket.on('cast-vote', async ({ espId, electionId }) => {
            try {
                const voteIndex = getVoteIndex(espId);
                console.log(`Vote received for election ${electionId} - index ${voteIndex}`);

                await voteCast(electionId, espId, voteIndex).catch(err => { throw err });

                io.of("/live-election").to("election").emit("vote-updated", { voteIndex })

                adminSocket.to(espId).emit('vote-updated', { voteIndex });
            } catch (err) {
                console.log(err.message);
            }
        });

        socket.on("present", (data) => {
            const { room, role } = data;
            isInitialized(room, role)
            console.log(room, role + " role bro")
            addPresence(room, role)
        });

        socket.on("vote-selected", async ({ espId, voteIndex }) => {
            try {
                console.log("here");

                console.log(espId, voteIndex);

                adminSocket.to(espId).emit("check-presence", espId);

                setTimeout(function () {
                    console.log("executing")
                    if (!arePresent(espId)) {
                        console.log("not present");
                        resetPresence(espId);
                        adminSocket.to(espId).emit("reset-selected", "reset request")
                        console.log("EVM or App got disconnected from websocket");
                        return
                    }

                    addVoteIndex(espId, voteIndex);

                    resetPresence(espId)

                    adminSocket.to(espId).emit("vote-selected", voteIndex);
                    console.log("emitted")
                }, 10000)


            } catch (err) {
                resetPresence(espId);
                console.log(err.message);
            }
        });
    });
}