const vote = new Map() // espId -> { groupIndex: buttonIndex }

function addVoteIndex(espId, groupIndex, buttonIndex) {
    if (!vote.has(espId)) vote.set(espId, {});
    vote.get(espId)[groupIndex] = buttonIndex;
}

function getVoteIndex(espId, groupIndex) {
    const votes = vote.get(espId);
    return votes ? votes[groupIndex] : undefined;
}

function getVoteIndexMap(espId) {
    return vote.get(espId) || {};
}

function deleteVoteIndex(espId) {
    vote.delete(espId);
}

module.exports = { addVoteIndex, getVoteIndex, getVoteIndexMap, deleteVoteIndex };
