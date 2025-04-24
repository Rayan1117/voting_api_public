const vote = new Map()

function addVoteIndex(espId, index) {
    vote.set(espId, index)
}

function getVoteIndex(espId) {
    return vote.get(espId)
}

function deleteVoteIndex(espId) {
    vote.delete(espId)
}

module.exports = {vote_index: Object.freeze(vote), addVoteIndex, getVoteIndex, deleteVoteIndex}