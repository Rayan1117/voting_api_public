const vote = new Map()

vote.set("NVEM1234",7)

function addVoteIndex(espId, index) {
    vote.set(espId, index)
}

function getVoteIndex(espId) {
    return vote.get(espId)
}

function deleteVoteIndex(espId) {
    vote.delete(espId)
}

module.exports = {addVoteIndex, getVoteIndex, deleteVoteIndex}