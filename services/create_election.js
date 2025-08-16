const db = require('../database')
const createElectionIfNotExist = async () => {
    try {
        const query = `
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = election)
        BEGIN
        CREATE TABLE election (
            election_id VARCHAR(36) PRIMARY KEY,
            election_name NVARCHAR(255) UNIQUE NOT NULL,
            config_id VARCHAR(36),
            FOREIGN KEY (config_id) REFERENCES config(config_id)
        );
        END
    `;
        await new db().execQuery(query)
        console.log(`Table election created or already exists.`);
    } catch (err) {
        console.log("Error creating table:", err);
    }
}

module.exports = createElectionIfNotExist