const db = require("../database")
const sql = require("mssql")

async function getTotalGroups(username) {
    try {
        const query = "SELECT c.group_pins AS groups FROM election e LEFT JOIN config c ON e.config_id = c.config_id WHERE e.esp_id = @username AND e.isCurrent = 1 "
        
        let { groups } = (await new db().execQuery(query, {
            "username" : {
                "type": sql.VarChar,
                "value": username
            }
        }))[0]
        
        groups = JSON.parse(groups)

        console.log(groups);

        const set = new Set()

        groups.forEach(g => {
            if (g != null)
                set.add(g)
        });

        return set.size;
        
    } catch(err) {
        throw err
    }
}

module.exports = {getTotalGroups}