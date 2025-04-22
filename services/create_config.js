const createConfigIfNotExists = async () => {
    try {
        const createTableQuery = `
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = config)
            BEGIN
            CREATE TABLE config (
                config_id VARCHAR(36) PRIMARY KEY,
                pin_bits NVARCHAR(36) NOT NULL,
                group_pins NVARCHAR(36) NOT NULL
            );
            END
        `;
        await new db().execQuery(createTableQuery);
        console.log(`Table config created or already exists.`);
    } catch (err) {
        console.log("Error creating table:", err);
    }
};

module.exports = createConfigIfNotExists