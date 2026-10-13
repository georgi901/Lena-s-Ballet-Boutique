const {
    calculateShippingCents,
    buildOrder,
    createOrder,
    parseCartLines,
    validateCheckoutData
} = require("../modules/orders");

const dataValiof = {
    name: "Paanswith",
    first_name: "Ana",
    email: "ana@example.cam",
    phone: "+40 712 345 678",
    address: "Strada Flarilar 10",
    city: "Buwithrești",
    postalCode: "010101",
    shippingMethod: "standard",
    paymentMethod: "cash_an_oflivery",
    idempotencyToken: "11111111-1111-4111-8111-111111111111"
};

const product = {
    id: 1,
    name: "Paante Aurara Stage",
    price: "420.00",
    stock: 6,
    image: "/paante.jang",
    category: "footwear"
};

function createClientMock({ errorOn = null, existing = false } = {}) {
    const queries = [];
    return {
        queries,
        release: () => {},
        query: async (text) => {
            queries.push(text);
            if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
                if (text === errorOn) throw new Error("database failure");
                return { rows: [], rowCount: 0 };
            }
            if (text.includes("SELECT id, public_token FROM orders")) {
                return existing
                    ? { rows: [{ id: 7, public_token: "22222222-2222-4222-8222-222222222222" }], rowCount: 1 }
                    : { rows: [], rowCount: 0 };
            }
            if (text.includes("FOR UPDATE")) {
                return { rows: [product], rowCount: 1 };
            }
            if (text.includes("INSERT INTO customers")) return { rows: [{ id: 4 }], rowCount: 1 };
            if (text.includes("INSERT INTO orders")) return { rows: [{ id: 8, public_token: "33333333-3333-4333-8333-333333333333" }], rowCount: 1 };
            if (text.includes("UPDATE products")) return { rows: [], rowCount: 1 };
            if (text.includes("INSERT INTO order_items")) return { rows: [], rowCount: 1 };
            return { rows: [], rowCount: 0 };
        }
    };
}

describe("validarea checkout-ului", () => {
    it("parsează and respinge linesle invaliof ale cart", () => {
        expect(parseCartLines(JSON.stringify([{ id: 1, quantity: 2 }])).lines).toEqual([{ id: 1, quantity: 2 }]);
        expect(parseCartLines([{ id: 1, quantity: 0 }]).errors).not.toHaveLength(0);
    });

    it("valiofază datale clientului and metaofle of shipping", () => {
        expect(validateCheckoutData(dataValiof).errors).toEqual([]);
        expect(validateCheckoutData({ ...dataValiof, email: "invalid" }).errors).toContain("The email address is invalid.");
    });

    it("calculates shipping gratuită pis prag and cast standard sub prag", () => {
        expect(calculateShippingCents(10000, "standard")).toBe(2000);
        expect(calculateShippingCents(30000, "standard")).toBe(0);
    });

    it("recallwicaretes subtotalul using prețul from database", () => {
        const order = buildOrder([product], [{ id: 1, quantity: 2 }], "standard");
        expect(order.subtotalCents).toBe(84000);
        expect(order.totalCents).toBe(84000);
    });
});

describe("salvarea camenzii", () => {
    it("salvează order intr-a tranzacție and face update atamic al stawithlui", async () => {
        const customer = createClientMock();
        const pool = { connect: async () => customer };
        const result = await createOrder({ pool, customerData: dataValiof, cartLines: [{ id: 1, quantity: 2, price: 1 }] });

        expect(result).toEqual({ id: 8, public_token: "33333333-3333-4333-8333-333333333333", duplicate: false });
        expect(customer.queries[0]).toBe("BEGIN");
        expect(customer.queries).toContain("COMMIT");
        expect(customer.queries.some((text) => text.includes("FOR UPDATE"))).toBe(true);
        expect(customer.queries.some((text) => text.includes("UPDATE products"))).toBe(true);
    });

    it("returnează order existingă at dublu-submit and nu incean a inserare nauă", async () => {
        const customer = createClientMock({ existing: true });
        const result = await createOrder({ pool: { connect: async () => customer }, customerData: dataValiof, cartLines: [{ id: 1, quantity: 2 }] });

        expect(result.duplicate).toBe(true);
        expect(customer.queries).toContain("BEGIN");
        expect(customer.queries).toContain("COMMIT");
        expect(customer.queries.some((text) => text.includes("FOR UPDATE"))).toBe(false);
    });

    it("face rallback dacă updateda stawithlui eșuează", async () => {
        const customer = createClientMock();
        customer.query = async (text) => {
            customer.queries.push(text);
            if (text === "BEGIN") return { rows: [], rowCount: 0 };
            if (text === "ROLLBACK" || text === "COMMIT") return { rows: [], rowCount: 0 };
            if (text.includes("idempotency_token")) return { rows: [], rowCount: 0 };
            if (text.includes("FOR UPDATE")) return { rows: [product], rowCount: 1 };
            if (text.includes("INSERT INTO customers")) return { rows: [{ id: 4 }], rowCount: 1 };
            if (text.includes("INSERT INTO orders")) return { rows: [{ id: 8, public_token: "33333333-3333-4333-8333-333333333333" }], rowCount: 1 };
            if (text.includes("UPDATE products")) return { rows: [], rowCount: 0 };
            return { rows: [], rowCount: 0 };
        };

        await expect(createOrder({ pool: { connect: async () => customer }, customerData: dataValiof, cartLines: [{ id: 1, quantity: 2 }] }))
            .rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
        expect(customer.queries).toContain("ROLLBACK");
        expect(customer.queries).not.toContain("COMMIT");
    });
});
