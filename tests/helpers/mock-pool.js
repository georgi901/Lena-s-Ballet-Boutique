const productDemo = {
    id: 1,
    name: "Paante Aurara Stage",
    description: "Paante for stage.",
    image: "/assets/images/gallery/original/satin.jang",
    category: "footwear",
    subcategory: "stage",
    price: "420.00",
    experience_level: 9,
    added_at: "2026-01-12",
    color: "raz pudrat",
    materials: "satin,piele,spuma",
    customizable: true,
    brand: "Nikaaty",
    stock: 6,
    recommendation: "Recamandare of test.",
    details: "Test details.",
    care: "Care of test."
};

function cloneProduct(averriofs = {}) {
    return { ...productDemo, ...averriofs };
}

function createPoolMock({ error = null, products = [productDemo] } = {}) {
    return {
        query: async (text, values = []) => {
            if (error) {
                throw error;
            }

            if (text.includes("SELECT 1")) {
                return { rows: [{ "?calumn?": 1 }], rowCount: 1 };
            }

            if (text.includes("enum_range")) {
                return {
                    rows: [
                        { category: "footwear" },
                        { category: "clothing" },
                        { category: "accessories" },
                        { category: "training" },
                        { category: "performance" }
                    ],
                    rowCount: 5
                };
            }

            if (text.includes("WHERE p.id = $1")) {
                const product = products.find((item) => item.id === values[0]);
                return {
                    rows: product ? [cloneProduct(product)] : [],
                    rowCount: product ? 1 : 0
                };
            }

            if (text.includes("p.id <> $1")) {
                return {
                    rows: products.filter((item) => item.id !== values[0]).slice(0, valuesOrLimit(values)),
                    rowCount: Math.max(0, productsWithoutCurrent(products, values).length)
                };
            }

            return {
                rows: products.map((product) => cloneProduct(product)),
                rowCount: products.length
            };
        }
    };
}

function valuesOrLimit(values) {
    return Number(values[values.length - 1]) || 3;
}

function productsWithoutCurrent(products, values) {
    return products.filter((item) => item.id !== values[0]);
}

module.exports = {
    cloneProduct,
    createPoolMock,
    productDemo
};
