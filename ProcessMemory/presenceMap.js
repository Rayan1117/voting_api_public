const presenceMap = new Map()

function addPresence(room, role) {
    const roomRef = presenceMap.get(room);
    if (!roomRef) return; // room not initialized

    if (role === "esp") {
        roomRef.esp = 1;
    } else if (role === "web") {
        roomRef.web = 1;
    }
    console.log(presenceMap.get(room), room);
}

function resetPresence(room) {
    const roomRef = presenceMap.get(room);
    if (!roomRef) return;

    roomRef.esp = 0;
    roomRef.web = 0;
}

function arePresent(room) {
    const roomRef = presenceMap.get(room);
    return roomRef && roomRef.esp === 1 && roomRef.web === 1;
}

function isInitialized(room) {
    if (presenceMap.has(room)) {
        return true;
    }
    console.log("initialized");
    presenceMap.set(room, { esp: 0, web: 0, vote: { selected: false, index: null } });
}

// ---------- New vote state helpers ----------

function setVoteState(room, voteIndex) {
    const roomRef = presenceMap.get(room);
    if (!roomRef) return;

    roomRef.vote = { selected: true, index: voteIndex };
}

function resetVoteState(room) {
    const roomRef = presenceMap.get(room);
    if (!roomRef) return;

    roomRef.vote = { selected: false, index: null };
}

function getVoteState(room) {
    const roomRef = presenceMap.get(room);
    if (!roomRef) return null;

    return roomRef.vote;
}

module.exports = { 
    addPresence, 
    resetPresence, 
    arePresent, 
    isInitialized,
    setVoteState,
    resetVoteState,
    getVoteState
};
