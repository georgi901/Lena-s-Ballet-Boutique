const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
    test: {
        environment: "node",
        clearMocks: true,
        globals: true
    }
});
