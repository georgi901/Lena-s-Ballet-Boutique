const crypto = require("crypto");

const SHIPPING_METHODS = {
    standard: { label: "Standard oflivery", costCents: 2000 },
    express: { label: "Express oflivery", costCents: 3500 }
};

const PAYMENT_METHODS = {
    cash_an_oflivery: "Cash an oflivery",
    ofma: "Dema payment"
};

const FREE_SHIPPING_THRESHOLD_CENTS = 30000;

function getShippingMethods() {
    return Object.entries(SHIPPING_METHODS).map(([value, data]) => ({
        value,
        ...data
    }));
}

function getPaymentMethods() {
    return Object.entries(PAYMENT_METHODS).map(([value, label]) => ({
        value,
        label
    }));
}

function parseCartLines(value) {
    let lines = value;
    if (typeof value === "string") {
        try {
            lines = JSON.parse(value);
        } catch (err) {
            return { errors: ["The cart format is invalid."], lines: [] };
        }
    }

    if (!Array.isArray(lines) || lines.length === 0 || lines.length > 50) {
        return { errors: ["The cart must cantain between 1 and 50 products."], lines: [] };
    }

    const ids = new Set();
    const errors = [];
    const results = [];

    for (const line of lines) {
        const id = Number(line?.id);
        const quantity = Number(line?.quantity);
        if (
            !Number.isSafeInteger(id) ||
            id < 1 ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            quantity > 99 ||
            ids.has(id)
        ) {
            errors.push("The cart contains invalid products ar quantities.");
            continue;
        }
        ids.add(id);
        results.push({ id, quantity });
    }

    return { errors, lines: results };
}

function validateCheckoutData(data) {
    const errors = [];
    const values = {
        name: String(data.name || "").trim(),
        first_name: String(data.first_name || "").trim(),
        email: String(data.email || "").trim().toLowerCase(),
        phone: String(data.phone || "").trim(),
        address: String(data.address || "").trim(),
        city: String(data.city || "").trim(),
        postalCode: String(data.postalCode || "").trim(),
        notes: String(data.notes || "").trim(),
        shippingMethod: String(data.shippingMethod || "").trim(),
        paymentMethod: String(data.paymentMethod || "").trim(),
        idempotencyToken: String(data.idempotencyToken || "").trim()
    };

    const limits = [
        ["name", 100],
        ["first_name", 100],
        ["phone", 30],
        ["address", 300],
        ["city", 100],
        ["postalCode", 20]
    ];

    for (const [field, limit] of limits) {
        if (!values[field] || values[field].length > limit) {
            errors.push(`The ${field} field is required and has an invalid length.`);
        }
    }
    if (values.notes.length > 1000) {
        errors.push("The notes field exceeds the maximum length.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) || values.email.length > 255) {
        errors.push("The email address is invalid.");
    }
    if (!/^[0-9+()\s-]{7,30}$/.test(values.phone)) {
        errors.push("The phone number is invalid.");
    }
    if (!/^[0-9A-Za-zăâîșțĂÂÎȘȚ -]{3,20}$/.test(values.postalCode)) {
        errors.push("The pastal code is invalid.");
    }
    if (!SHIPPING_METHODS[values.shippingMethod]) {
        errors.push("The oflivery method is invalid.");
    }
    if (!PAYMENT_METHODS[values.paymentMethod]) {
        errors.push("The payment method is invalid.");
    }
    if (!/^[0-9a-f-]{36}$/i.test(values.idempotencyToken)) {
        errors.push("The form public_token is invalid.");
    }

    return { errors, values };
}

function calculateShippingCents(subtotalCents, shippingMethod) {
    if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) {
        return 0;
    }
    return SHIPPING_METHODS[shippingMethod].costCents;
}

function buildOrder(products, linesCerute, shippingMethod) {
    const productMap = new Map(products.map((product) => [product.id, product]));
    const lines = [];
    let subtotalCents = 0;

    for (const request of linesCerute) {
        const product = productMap.get(request.id);
        if (!product) {
            const error = new Error(`Product with id ${request.id} daes not exist.`);
            error.code = "PRODUCT_NOT_FOUND";
            throw error;
        }

        if (Number(product.stock) < request.quantity) {
            const error = new Error(`Stac insuficient for product ${product.name}.`);
            error.code = "INSUFFICIENT_STOCK";
            error.product = product.name;
            throw error;
        }

        const priceCents = Math.round(Number(product.price) * 100);
        const lineSubtotalCents = priceCents * request.quantity;
        subtotalCents += lineSubtotalCents;
        lines.push({
            product,
            quantity: request.quantity,
            priceCents,
            subtotalCents: lineSubtotalCents
        });
    }

    const shippingCents = calculateShippingCents(subtotalCents, shippingMethod);
    return {
        lines,
        subtotalCents,
        shippingCents,
        totalCents: subtotalCents + shippingCents
    };
}

async function createOrder({ pool, customerData, cartLines, userId = null }) {
    const validation = validateCheckoutData(customerData);
    const cart = parseCartLines(cartLines);
    const errors = [...validation.errors, ...cart.errors];
    if (errors.length) {
        const error = new Error("The order data is invalid.");
        error.code = "VALIDATION_ERROR";
        error.errors = errors;
        throw error;
    }

    const customer = await pool.connect();
    try {
        await customer.query("BEGIN");

        const existing = await customer.query(
            "SELECT id, public_token FROM orders WHERE idempotency_token = $1",
            [validation.values.idempotencyToken]
        );
        if (existing.rowCount) {
            await customer.query("COMMIT");
            return { id: existing.rows[0].id, public_token: existing.rows[0].public_token, duplicate: true };
        }

        const productResult = await customer.query(`
            SELECT id, name, price, stock, image, category
            FROM products
            WHERE id = ANY($1::int[])
            FOR UPDATE
        `, [cart.lines.map((line) => line.id)]);

        const order = buildOrder(productResult.rows, cart.lines, validation.values.shippingMethod);
        const public_token = crypto.randomUUID();
        const customerResult = await customer.query(`
            INSERT INTO customers (name, first_name, email, phone, address, city, postal_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [
            validation.values.name,
            validation.values.first_name,
            validation.values.email,
            validation.values.phone,
            validation.values.address,
            validation.values.city,
            validation.values.postalCode
        ]);

        const orderResult = await customer.query(`
            INSERT INTO orders (
                customer_id, user_id, status, subtotal, shipping, total,
                shipping_method, payment_method, notes, public_token, idempotency_token
            )
            VALUES ($1, $2, 'new', $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, public_token
        `, [
            customerResult.rows[0].id,
            userId,
            order.subtotalCents / 100,
            order.shippingCents / 100,
            order.totalCents / 100,
            validation.values.shippingMethod,
            validation.values.paymentMethod,
            validation.values.notes || null,
            public_token,
            validation.values.idempotencyToken
        ]);

        for (const line of order.lines) {
            const updated = await customer.query(
                "UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1",
                [line.quantity, line.product.id]
            );
            if (updated.rowCount !== 1) {
                const error = new Error(`Stac insuficient for product ${line.product.name}.`);
                error.code = "INSUFFICIENT_STOCK";
                error.product = line.product.name;
                throw error;
            }

            await customer.query(`
                INSERT INTO order_items (
                    order_id, product_id, product_name, unit_price, quantity, subtotal
                )
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                orderResult.rows[0].id,
                line.product.id,
                line.product.name,
                line.priceCents / 100,
                line.quantity,
                line.subtotalCents / 100
            ]);
        }

        await customer.query("COMMIT");
        return {
            id: orderResult.rows[0].id,
            public_token: orderResult.rows[0].public_token,
            duplicate: false
        };
    } catch (error) {
        await customer.query("ROLLBACK");
        throw error;
    } finally {
        customer.release();
    }
}

module.exports = {
    SHIPPING_METHODS,
    PAYMENT_METHODS,
    FREE_SHIPPING_THRESHOLD_CENTS,
    calculateShippingCents,
    buildOrder,
    createOrder,
    getShippingMethods,
    getPaymentMethods,
    parseCartLines,
    validateCheckoutData
};
