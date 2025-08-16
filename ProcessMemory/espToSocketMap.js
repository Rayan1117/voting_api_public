const EspToSocketID = new Map();

function addSocket(espID, socket) {
    EspToSocketID.set(espID, socket);
}

function removeSocket(espID) {
    EspToSocketID.delete(espID);
}

function getSocket(espID) {
    
    return EspToSocketID.get(espID);
}

function printAllSockets() {
    console.log(EspToSocketID);
}

module.exports = {
    addSocket,
    removeSocket,
    getSocket,
    printAllSockets
};
