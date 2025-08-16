exports.groupAndSumVotes = function(vote_count, group_pins) {
    const result = {};

    for (let i = 0; i < vote_count.length; i++) {
        const group = group_pins[i];
        const vote = vote_count[i];

        if (result[group]) {
            result[group] += vote;
        } else {
            result[group] = vote;
        }
    }

    return result;
}
