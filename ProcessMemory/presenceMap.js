const presenceMap = new Map()

function addPresence(room, role){
    if(role === "esp") {
        const roomRef = presenceMap.get(room);
        roomRef.esp++;
    }
    else if(role === "web") {
        const roomRef = presenceMap.get(room);
        roomRef.web++;
    }
    console.log(presenceMap.get(room), room);
}

function resetPresence(room){
    const roomRef = presenceMap.get(room);
    roomRef["esp"] = 0;
    roomRef["web"] = 0;
}

function arePresent(room) {
    const roomRef = presenceMap.get(room);
    return roomRef && roomRef.esp === 1 &&  roomRef.web === 1
}

function isInitialized(room) {
    if(presenceMap.has(room)){
        return true;
    }
    console.log("initialized")
    presenceMap.set(room, {"esp": 0, "web": 0});
}


module.exports = {addPresence, resetPresence, arePresent, isInitialized};