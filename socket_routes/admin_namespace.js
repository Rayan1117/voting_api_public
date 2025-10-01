const { 
    addSocket, 
    removeSocket 
} = require('../ProcessMemory/espToSocketMap');

const { voteCast } = require('../admin_routes/vote_cast');
const { addVoteIndex, getVoteIndex } = require('../ProcessMemory/voteMemo');

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
    
    // middleware: only admins allowed
    adminSocket.use(verifySocketRole("admin"));

    adminSocket.on('connection', (socket) => {
        console.log("Admin connected:", socket.id);

        // when admin app connects to a specific esp
        socket.on("post-connection", ({ espId }) => {
            console.log("post-connection -> espId:", espId);

            addSocket(espId, socket);

            // ensure presence map initialized
            isInitialized(espId);

            // 🔄 check if there’s a pending vote state
            const state = getVoteState(espId);
            if (state?.selected) {
                console.log("Restoring vote state for esp:", espId, state);
                socket.emit("vote-selected", state.index);
            }
        });

        // debug message pipe
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

        // election start
        socket.on('start-election', ({ espId }) => {
            console.log(`Election started for ${espId}`);

            socket.join(espId);
            adminSocket.to(espId).emit('election-started', espId);
        });

        // cast a vote
        socket.on('cast-vote', async ({ espId, electionId }) => {
            try {
                const voteIndex = getVoteIndex(espId);
                console.log(`Vote received for election ${electionId} - index ${voteIndex}`);

                await voteCast(electionId, espId, voteIndex);

                // reset vote state after cast
                resetVoteState(espId);

                io.of("/live-election").to("election").emit("vote-updated", { voteIndex });
                adminSocket.to(espId).emit('vote-updated', { voteIndex });
            } catch (err) {
                console.log("cast-vote error:", err.message);
            }
        });

        // presence check
        socket.on("present", ({ room, role }) => {
            isInitialized(room);
            addPresence(room, role);
            console.log(`${role} present in ${room}`);
        });

        // vote selection
        socket.on("vote-selected", async ({ espId, voteIndex }) => {
            try {
                console.log("vote-selected:", espId, voteIndex);

                adminSocket.to(espId).emit("check-presence", espId);

                setTimeout(function () {
                    console.log("vote-selected timeout check for", espId);

                    if (!arePresent(espId)) {
                        console.log("presence failed -> reset");
                        resetPresence(espId);
                        resetVoteState(espId);
                        adminSocket.to(espId).emit("reset-selected", "reset request");
                        return;
                    }

                    // ✅ store vote index into memory
                    addVoteIndex(espId, voteIndex);
                    setVoteState(espId, voteIndex);

                    resetPresence(espId);

                    adminSocket.to(espId).emit("vote-selected", voteIndex);
                    console.log("vote-selected confirmed + emitted");
                }, 3000);

            } catch (err) {
                resetPresence(espId);
                resetVoteState(espId);
                console.log("vote-selected error:", err.message);
            }
        });
    });
};
