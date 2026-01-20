const presenceMap = new Map()

function addPresence(room, role) {
    const roomRef = presenceMap.get(room);
    if (!roomRef) return;

    if (role === "esp") roomRef.esp = 1;
    else if (role === "web") roomRef.web = 1;

    console.log(presenceMap.get(room), room);
}

function resetPresence(room) {
    const roomRef = presenceMap.get(room);
    console.log("room ref: ",roomRef);
    
    if (!roomRef) return;
    roomRef.esp = 0;
    roomRef.web = 0;
}

function arePresent(room) {
    const roomRef = presenceMap.get(room);
    return roomRef && roomRef.esp === 1 && roomRef.web === 1;
}

function isInitialized(room) {
    if (presenceMap.has(room)) return true;
    console.log("initialized");
    presenceMap.set(room, { esp: 0, web: 0, vote: { selected: false, votes: {} } });
}

module.exports = { addPresence, resetPresence, arePresent, isInitialized };
