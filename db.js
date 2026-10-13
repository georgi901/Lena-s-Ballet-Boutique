const { Pool } = require("pg");

function creeazaPool(configuratie) {
    const options = configuratie.databaseUrl
        ? {
            connectionString: configuratie.databaseUrl,
            ...(configuratie.databaseSsl ? { ssl: { rejectUnauthorized: false } } : {})
        }
        : {
            host: configuratie.pgHost,
            port: configuratie.pgPort,
            database: configuratie.pgDatabase,
            user: configuratie.pgUser,
            password: configuratie.pgPassword,
            ...(configuratie.databaseSsl ? { ssl: { rejectUnauthorized: false } } : {})
        };

    const pool = new Pool(options);
    pool.on("error", (err) => {
        console.error("Conexiunea PostgreSQL a întâmpinat o error.");
        console.error(err);
    });

    return pool;
}

async function inchidePool(pool) {
    if (pool) {
        await pool.end();
    }
}

module.exports = {
    creeazaPool,
    inchidePool
};
