const { addSocket, removeSocket } = require('../ProcessMemory/espToSocketMap');
const { voteCast } = require('../admin_routes/vote_cast');
const { getSocket } = require('../ProcessMemory/espToSocketMap');
const {
    isInitialized,
    arePresent,
    addPresence,
    resetPresence,
    setVoteState,
    resetVoteState,
    getVoteState
} = require("../ProcessMemory/presenceMap");
const { verifySocketRole } = require('../authorization/verify_role');

exports.adminSocketContext = function (adminSocket, io) {
    // Only admins allowed
    adminSocket.use(verifySocketRole("admin"));

    adminSocket.on('connection', (socket) => {
        console.log("Admin connected:", socket.id);

        // When admin app connects to a specific ESP
        socket.on("post-connection", ({ espId, role }) => {
            console.log("post-connection -> espId:", espId);
            if (role == "esp") {
                addSocket(espId, socket);
                console.log("esp socket added for ", espId);
            }

            socket.join(espId);
            console.log(role, " of ", espId, " joined room");


            // Initialize presence/vote map
            isInitialized(espId);

            // Restore previous vote state if any
            const state = getVoteState(espId);
            if (state?.selected) {
                console.log("Restoring vote state for esp:", espId, state);
                socket.emit("vote-selected", state.votes || state.index);
            }
        });

        // Debug
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

        // Cast a vote to DB
        socket.on('cast-vote', async ({ espId, electionId }) => {
            try {
                const votes = getVoteState(espId)?.votes;
                if (!votes || Object.keys(votes).length === 0) throw new Error("votes not found");

                for (let group in votes) {
                    await voteCast(electionId, espId, group, votes[group]);
                }

                resetVoteState(espId);

                // Instead of fetching candidates again, only emit what changed
                const payload = {
                    electionId,
                    espId,
                    updatedVotes: votes   // e.g. { "0": 1, "2": 1 } means incremented index 0 & 2
                };
                resetPresence(espId)
                io.of("/live-election").to("election").emit("vote-updated", payload);
                socket.to(espId).emit("vote-updated")
            } catch (err) {
                console.log("cast-vote error:", err.message);
            }
        });

        // Presence check
        socket.on("present", ({ room, role }) => {
            console.log(room, role);

            isInitialized(room);
            addPresence(room, role);
            console.log(`${role} present in ${room}`);
        });

        // Vote-selected from ESP
        socket.on("vote-selected", async ({ espId, votes }) => {
            try {
                console.log("vote-selected:", espId, votes);

                // ✅ Store votes immediately
                const voteState = { selected: true, votes };
                setVoteState(espId, votes);

                // Ask ESP to confirm presence
                adminSocket.to(espId).emit("check-presence", espId);


                setTimeout(() => {
                    if (!arePresent(espId)) {
                        console.log("Presence failed -> reset");
                        resetPresence(espId);
                        resetVoteState(espId);
                        adminSocket.to(espId).emit("reset-selected", "reset request");
                        return;
                    }

                    // Broadcast vote-selected
                    adminSocket.to(espId).emit("vote-selected", votes);
                    console.log("vote-selected confirmed + emitted");
                }, 2000);

            } catch (err) {
                resetPresence(espId);
                resetVoteState(espId);
                console.log("vote-selected error:", err.message);
            }
        });
    });
};
