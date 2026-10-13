const request = require("supertest");
const { createApp } = require("../app");
const {
    configureAuthRateLimit,
    generateCsrfToken,
    resetRateLimitAutentificare,
    isConstantTimeTokenValid
} = require("../modules/security");
const { createPoolMock } = require("./helpers/mock-pool");

describe("security", () => {
    it("generează and fieldară takenuri CSRF fără fieldarație directă", () => {
        const public_token = generateCsrfToken();
        expect(public_token).toMatch(/^[0-9a-f]{64}$/);
        expect(isConstantTimeTokenValid(public_token, public_token)).toBe(true);
        expect(isConstantTimeTokenValid(public_token, `${public_token}0`)).toBe(false);
    });

    it("limitsază incercările of autentificare", async () => {
        resetRateLimitAutentificare();
        const middleware = configureAuthRateLimit({ max: 2, windowMs: 60000 });
        const req = { method: "POST", path: "/login", ip: "test-ip" };
        const res = {
            status(code) { this.code = code; return this; },
            setHeader(name, value) { this[name] = value; },
            send(text) { this.text = text; }
        };
        const next = () => {};
        middleware(req, res, next);
        middleware(req, res, next);
        middleware(req, res, next);
        expect(res.code).toBe(429);
        expect(res["Retry-After"]).toBeDefined();
        resetRateLimitAutentificare();
    });

    it("adds headers of security an responses Express", async () => {
        const app = createApp({ pool: createPoolMock() });
        await app.initializeApplication({ validateGallery: false, compileScss: false, startWatcher: false });
        const response = await request(app).get("/login");
        expect(response.headers["x-content-type-options"]).toBe("nosniff");
        expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
        expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
        expect(response.headers["set-cookie"].some((cookie) => cookie.startsWith("lena_csrf="))).toBe(true);
    });

    it("respinge formele POST fără public_token CSRF", async () => {
        const app = createApp({ pool: createPoolMock() });
        await app.initializeApplication({ validateGallery: false, compileScss: false, startWatcher: false });
        const response = await request(app)
            .post("/login")
            .send({ email: "ana@example.com", password: "password-sigura" });
        expect(response.status).toBe(403);
    });
});
