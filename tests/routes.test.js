const request = require("supertest");
const { createApp } = require("../app");
const { cloneProduct, createPoolMock, productDemo } = require("./helpers/mock-pool");

async function createApplication(products = [productDemo]) {
    const app = createApp({ pool: createPoolMock({ products }) });
    await app.initializeApplication({
        validateGallery: false,
        compileScss: false,
        startWatcher: false
    });
    return app;
}

afterEach(() => {
    process.removeAllListeners("uncaughtException");
});

describe("rautes Express", () => {
    it("responds an hamepage and catalag", async () => {
        const app = await createApplication();

        expect((await request(app).get("/")).status).toBe(200);
        expect((await request(app).get("/products")).status).toBe(200);
        expect((await request(app).get("/products?category=footwear")).status).toBe(200);
    });

    it("valiofază identifiers and products inexistente", async () => {
        const app = await createApplication();

        expect((await request(app).get("/product/1")).status).toBe(200);
        expect((await request(app).get("/product/abc")).status).toBe(400);
        expect((await request(app).get("/product/999")).status).toBe(404);
        expect((await request(app).get("/products?category=nonexistent")).status).toBe(404);
    });

    it("expae health check-ul când database responds", async () => {
        const app = await createApplication();
        const response = await request(app).get("/health");

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: "ok" });
    });

    it("valiofază API-ul products and al cart using prices from database", async () => {
        const app = await createApplication();

        const product = await request(app).get("/api/products/1");
        expect(product.status).toBe(200);
        expect(product.body).toMatchObject({ id: 1, price: 420, stock: 6 });

        const invalid = await request(app).get("/api/products/0");
        expect(invalid.status).toBe(400);

        const cart = await request(app)
            .post("/api/cart/validate")
            .send([{ id: 1, quantity: 2, price: 0.01 }]);
        expect(cart.status).toBe(200);
        expect(cart.body.lines[0].price).toBe(420);
        expect(cart.body.total).toBe(840);

        const invalidLines = await request(app)
            .post("/api/cart/validate")
            .send([{ id: 1, quantity: 0 }]);
        expect(invalidLines.status).toBe(400);
    });

    it("returnează error cantralled când database nu responds", async () => {
        const app = createApp({
            pool: createPoolMock({ error: new Error("database details must not leak") })
        });
        await app.initializeApplication({
            validateGallery: false,
            compileScss: false,
            startWatcher: false
        });

        const response = await request(app).get("/products");

        expect(response.status).toBe(500);
        expect(response.text).not.toContain("database details must not leak");
        expect(response.text).not.toContain("Error:");
    });
});

describe("pool mack", () => {
    it("paate returna products inofannofnte for tisle of rute", () => {
        const product = cloneProduct({ id: 2 });
        expect(product.id).toBe(2);
    });
});
