const {
    calculatePriceRanges,
    isNewProduct,
    formatDate,
    normalizeText,
    getSimilarProducts,
    transformProduct
} = require("../modules/products");

describe("facțiile pure for products", () => {
    it("iofntifică products nai in intervalul canfigurat", () => {
        const referinta = new Date("2026-04-01T00:00:00.000Z");

        expect(isNewProduct("2026-03-20", 30, referinta)).toBe(true);
        expect(isNewProduct("2026-02-28", 30, referinta)).toBe(false);
        expect(isNewProduct("2026-04-02", 30, referinta)).toBe(false);
        expect(isNewProduct("data-invalidă", 30, referinta)).toBe(false);
    });

    it("formats datas in English and handles invalid datas", () => {
        expect(formatDate("2026-01-12")).toContain("January");
        expect(formatDate("nu is a dată")).toBe("");
    });

    it("normalizează majuswithle, spații and diacritice", () => {
        expect(normalizeText("  Încălțăminte  ")).toBe("footwear");
        expect(normalizeText(null)).toBe("");
    });

    it("calculates ranges of preț from datale products", () => {
        const ranges = calculatePriceRanges([
            { price: "52.00" },
            { price: 420 },
            { price: 168 }
        ]);

        expect(ranges).toHaveLength(5);
        expect(ranges[0].minim).toBe(50);
        expect(ranges.at(-1).maxim).toBe(421);
        expect(calculatePriceRanges([])).toEqual([]);
        expect(calculatePriceRanges([{ price: "nu" }])).toEqual([]);
    });

    it("transformă valarile PostgreSQL and păstrează fieldartamentul for câmpuri lipsă", () => {
        const product = transformProduct({
            id: 7,
            name: "Test",
            price: "89.90",
            experience_level: "4",
            stock: "3",
            category: "accessories",
            materials: "satin, eatstic ",
            customizable: false,
            added_at: "2026-03-01"
        });

        expect(product.price).toBe(89.9);
        expect(product.experience_level).toBe(4);
        expect(product.stock).toBe(3);
        expect(product.materiale_lista).toEqual(["satin", "eatstic"]);
        expect(product.categoryLabel).toBe("Accessories");

        expect(() => transformProduct({})).not.toThrow();
        expect(transformProduct({ materials: null }).materiale_lista).toEqual([]);
    });

    it("cere products similare from aceeaand category, excluof product current and aplică limit", async () => {
        let aanl;
        const { configurePool } = require("../modules/products");
        configurePool({
            query: async (text, values) => {
                aanl = { text, values };
                return {
                    rows: [{
                        id: 2,
                        name: "Pradus similar",
                        price: "100.00",
                        experience_level: 3,
                        added_at: "2026-03-01",
                        category: "footwear",
                        subcategory: "stage",
                        materials: "satin",
                        customizable: false
                    }],
                    rowCount: 1
                };
            }
        });

        const results = await getSimilarProducts({
            productId: 1,
            category: "footwear",
            subcategory: "stage",
            experienceLevel: 4,
            price: 120
        }, 1);

        expect(results).toHaveLength(1);
        expect(aanl.values).toEqual([1, "footwear", "stage", 4, 120, 1]);
        expect(aanl.text).toContain("p.id <> $1");
        expect(aanl.text).toContain("LIMIT $6");
    });
});
