const { addSocket, removeSocket } = require('../ProcessMemory/espToSocketMap');
const { voteCast } = require('../admin_routes/vote_cast');
const {
    isInitialized,
    arePresent,
    addPresence,
    resetPresence,
} = require("../ProcessMemory/presenceMap");
const { verifySocketRole } = require('../authorization/verify_role');
const { addVoteIndex, getVoteIndice, deleteVoteIndice, isAllCanidatesSelected } = require("../ProcessMemory/voteMemo")

exports.adminSocketContext = function (adminSocket, io) {

    adminSocket.use(verifySocketRole("admin"));

    adminSocket.on('connection', (socket) => {
        console.log("Admin connected:", socket.id);

        socket.on("post-connection", ({ espId, role }) => {
            console.log("post-connection -> espId:", espId);
            console.log("role", role);

            if (role == "esp") {
                addSocket(espId, socket);
                console.log("esp socket added for ", espId);
            }

            socket.join(espId);
            console.log(role, "of", espId, "joined room");


            isInitialized(espId);
        });

        socket.on("message", (data) => {
            console.log("message:", data);
            io.of("/live-election").to("election").emit("vote-updated", { voteIndex: 6 });
        });

        socket.on('pre-disconnect', (data) => {
            try {
                const { id } = JSON.parse(data);
                removeSocket(id);
            } catch (e) {
                console.log("pre-disconnect parse failed:", e.message);
            }
        });

        socket.on('disconnect', () => {
            console.log('Admin disconnected:', socket.id);
        });

        socket.on('cast-vote', async ({ espId, electionId }) => {
            try {
                const votes = (await getVoteIndice(espId)).map(Number)

                console.log("votes : " + votes);

                if (votes?.length == 0) throw new Error("votes not found")

                const updatedVotes = await voteCast(electionId, votes)

                const payload = {
                    electionId,
                    espId,
                    updatedVotes
                };

                console.log(payload.updatedVotes);

                deleteVoteIndice(espId)
                resetPresence(espId)
                io.of("/live-election").to("election").emit("vote-updated", payload);
                socket.to(espId).emit("vote-updated")
            } catch (err) {
                deleteVoteIndice(espId);
                resetPresence(espId)
                console.log("cast-vote error:", err.message);
            }
        });

        socket.on("present", ({ room, role }) => {
            console.log(room, role);

            isInitialized(room);
            addPresence(room, role);
            console.log(`${role} present in ${room}`);
        });

        socket.on("vote-selected", async (data) => {
            try {

                console.log(socket.username);

                var { espId, voteIndex: index } = data;

                console.log("vote index : ", index);

                await addVoteIndex(espId, index)

                if (await isAllCanidatesSelected(socket.username, espId)) {

                    adminSocket.to(espId).emit("check-presence", espId);

                    setTimeout(() => {
                        if (!arePresent(espId)) {
                            console.log("Presence failed -> reset");
                            resetPresence(espId);

                            return;
                        }

                        adminSocket.to(espId).emit("vote-selected", index);
                        console.log("vote-selected confirmed + emitted");
                    }, 2000);
                }

            } catch (err) {
                resetPresence(espId);
                deleteVoteIndice(espId);
                console.log("vote-selected error:", err);
            }
        });

    });

};
