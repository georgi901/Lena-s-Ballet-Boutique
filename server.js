const http = require("http");
const { citesteConfiguratie } = require("./config");
const { creeazaPool, inchidePool } = require("./db");
const { createApp } = require("./app");

async function pornesteServer() {
    const configuratie = citesteConfiguratie();
    const pool = creeazaPool(configuratie);
    const app = createApp({ pool });

    try {
        await app.initializeApplication();
        const server = app.listen(configuratie.port, () => {
            console.log(`Serverul a pornit pe portul ${configuratie.port}`);
        });

        const inchidereGratioasa = async (semnal) => {
            console.log(`Stopping server (${semnal}).`);
            server.close(async () => {
                await inchidePool(pool);
                process.exit(0);
            });
        };

        process.once("SIGTERM", () => inchidereGratioasa("SIGTERM"));
        process.once("SIGINT", () => inchidereGratioasa("SIGINT"));

        server.on("error", async (err) => {
            console.error("Serverul nu a putut porni.");
            console.error(err);
            await inchidePool(pool);
            process.exitCode = 1;
        });
    } catch (error) {
        await inchidePool(pool);
        throw error;
    }
}

if (require.main === module) {
    pornesteServer().catch((error) => {
        console.error("The application could not start.");
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {
    pornesteServer
};
