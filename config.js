const path = require("path");

if (process.env.NODE_ENV !== "production") {
    try {
        require("dotenv").config({ path: path.join(__dirname, ".env") });
    } catch (error) {
        if (error.code !== "MODULE_NOT_FOUND") {
            throw error;
        }
    }
}

const numarOptional = (value, valoareImplicita) => {
    if (value === undefined || value === "") {
        return valoareImplicita;
    }

    const result = Number(value);
    return Number.isFinite(result) ? result : null;
};

function citesteConfiguratie() {
    const configuratie = {
        nodeEnv: process.env.NODE_ENV || "development",
        port: numarOptional(process.env.PORT, 8080),
        pgHost: process.env.PGHOST,
        pgPort: numarOptional(process.env.PGPORT, 5432),
        pgDatabase: process.env.PGDATABASE,
        pgUser: process.env.PGUSER,
        pgPassword: process.env.PGPASSWORD,
        databaseUrl: process.env.DATABASE_URL,
        databaseSsl: process.env.DATABASE_SSL === "true",
        newProductDays: numarOptional(process.env.NEW_PRODUCT_DAYS, 120)
    };

    const variabileObligatorii = configuratie.databaseUrl
        ? []
        : [
            ["PGHOST", configuratie.pgHost],
            ["PGPORT", configuratie.pgPort],
            ["PGDATABASE", configuratie.pgDatabase],
            ["PGUSER", configuratie.pgUser],
            ["PGPASSWORD", configuratie.pgPassword]
        ];

    const lipsa = variabileObligatorii.find(([, value]) => value === undefined || value === null || value === "");
    if (lipsa) {
        throw new Error(`Missing required env var: ${lipsa[0]}`);
    }

    if (!configuratie.port || configuratie.port < 1 || configuratie.port > 65535) {
        throw new Error("Invalid env var: PORT");
    }

    if (!configuratie.pgPort || configuratie.pgPort < 1 || configuratie.pgPort > 65535) {
        throw new Error("Invalid env var: PGPORT");
    }

    return configuratie;
}

module.exports = {
    citesteConfiguratie
};
