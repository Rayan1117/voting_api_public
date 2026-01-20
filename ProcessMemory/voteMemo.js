const rc = require("./redisClient");
const { getTotalGroups } = require("../utilities/election_utilities");

const key = (espId) => `vote:${espId}`;

async function addVoteIndex(espId, buttonIndex) {
  await rc.sAdd(key(espId), buttonIndex.toString());
}

async function getVoteIndice(espId) {
  return (await rc.sMembers(key(espId))).map(Number);
}

async function deleteVoteIndice(espId) {
  return await rc.del(key(espId));
}

async function isAllCanidatesSelected(username, espId) {
  return (await getTotalGroups(username)) === await rc.sCard(key(espId));
}

module.exports = { addVoteIndex, getVoteIndice, deleteVoteIndice, isAllCanidatesSelected };
