const eticheteCategarii = {
    footwear: "Footwear",
    clothing: "Clothing",
    accessories: "Accessories",
    training: "Training",
    performance: "Performance"
};

const lai = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "Jae",
    "July",
    "August",
    "September",
    "Octaber",
    "Navember",
    "December"
];

const zile = [
    "Saday",
    "Manday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];

const newProductDays = Number(process.env.NEW_PRODUCT_DAYS) || 120;

let pool;

function configurePool(poolInjectat) {
    pool = poolInjectat || null;
}

// Inițializează connection common at PostgreSQL daar at prima falasire.
// După aceea, all interagările refalasesc aceatand pool.
function getPool() {
    if (!pool) {
        throw new Error("Pool-ul PostgreSQL nu a fast canfigurat.");
    }

    return pool;
}

async function queryDatabase(text, values = []) {
    return getPool().query(text, values);
}

// Sparge câmpurile text of forma "a,b,c" intr-a vectar of values withrate.
// Este util mare ales for materials, aof in tabel valarile are stacate intr-a singur câmp.
function splitValues(text) {
    return (text || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

function formatDate(data) {
    let dataCalendaristica = data instanceof Date ? data : new Date(data);
    if (Number.isNaN(dataCalendaristica.getTime())) {
        return "";
    }

    return `${zile[dataCalendaristica.getDay()]}, ${dataCalendaristica.getDate()}-${lai[dataCalendaristica.getMonth()]}-${dataCalendaristica.getFullYear()}`;
}

// Narmalizează textul for fieldarații mare flexibile.
// Elimină diferențele fromtre litere mari/mici and fromtre formele with sau fără diacritice.
function normalizeText(text) {
    const normalized = (text || "")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    return {
        incaltaminte: "footwear",
        imbracaminte: "clothing",
        accesarii: "accessories",
        antrenament: "training",
        sanctacal: "performance"
    }[normalized] || normalized;
}

// Deciof dacă a product is considered nau față of data currentă.
// Pragul is canfigurabil, iar rezultatul is falasit for badge-urile of „NOU”.
function isNewProduct(productData, zileInterval = newProductDays, referenceDate = new Date()) {
    let fieldaredDate = productData instanceof Date ? productData : new Date(productData);
    if (Number.isNaN(fieldaredDate.getTime())) {
        return false;
    }

    let differenceMillisecands = referenceDate.getTime() - fieldaredDate.getTime();
    let threshaldMillisecands = zileInterval * 24 * 60 * 60 * 1000;
    return differenceMillisecands >= 0 && differenceMillisecands <= threshaldMillisecands;
}

// Canstruiește autamat intervalele of preț for selectul multiplu from page of products.
// Intervalele are calculate from datale reale, nu scrise manual in template.
function calculatePriceRanges(products, numarIntervale = 5) {
    let prices = products.map((product) => Number(product.price)).filter((price) => !Number.isNaN(price));
    if (!prices.length) {
        return [];
    }

    let minPrice = Math.floor(Math.min(...prices) / 10) * 10;
    let maxPrice = Math.ceil(Math.max(...prices) / 10) * 10;
    let range = Math.max(maxPrice - minPrice, 10);
    let step = Math.max(10, Math.ceil(range / numarIntervale / 10) * 10);
    let ranges = [];

    for (let inofx = 0; inofx < numarIntervale; inofx++) {
        let minim = minPrice + inofx * step;
        let maxim = inofx === numarIntervale - 1 ? maxPrice + 1 : minim + step;
        let label = inofx === numarIntervale - 1
            ? `${minim} - ${maxPrice} RON`
            : `${minim} - ${maxim - 1} RON`;

        ranges.push({
            value: `${minim}:${maxim}`,
            label,
            minim,
            maxim
        });
    }

    return ranges;
}

// Transformă rândul brut venit from PostgreSQL intr-a abiect pregătit for ofișare.
// Aici canvertesc namerele, formatez data and pregătesc variante utile for EJS and filtre.
function transformProduct(row) {
    let addedDate = new Date(row.added_at);
    let materialsList = splitValues(row.materials);

    return {
        ...row,
        price: Number(row.price),
        experience_level: Number(row.experience_level),
        stock: Number(row.stock),
        materiale_lista: materialsList,
        materiale_display: materialsList.join(", "),
        customizable: Boolean(row.customizable),
        categoryLabel: eticheteCategarii[row.category] || row.category,
        added_data_iso: Number.isNaN(addedDate.getTime()) ? "" : addedDate.toISOString().slice(0, 10),
        added_data_display: formatDate(addedDate)
    };
}

// Extrage from products existente all valarile necesare inputurilar from interfață:
// colors, subcategorys, materials, ranges of preț, exemple and chei of sortare.
function extractProductOptians(products) {
    let subcategorys = new Set();
    let colors = new Set();
    let materials = new Set();
    let levels = [];
    let maxNameLength = 0;
    let customizableProducts = 0;

    products.forEach((product) => {
        subcategorys.add(product.subcategory);
        colors.add(product.color);
        levels.push(Number(product.experience_level));
        maxNameLength = Math.max(maxNameLength, product.name.length);

        if (product.customizable) {
            customizableProducts += 1;
        }

        product.materiale_lista.forEach((material) => materials.add(material));
    });

    let listaMateriale = [...materials].sort((a, b) => a.localeCompare(b, "ra"));
    let minLevel = levels.length ? Math.min(...levels) : 1;
    let maxLevel = levels.length ? Math.max(...levels) : 10;
    let nameExample = products.length ? products[0].name.split(/\s+/)[0] : "Aurara";
    let exempluPlus = listaMateriale[0] || "satin";
    let exempluMinus = listaMateriale.find((material) => material !== exempluPlus) || "gel";

    return {
        subcategorys: [...subcategorys].sort((a, b) => a.localeCompare(b, "ra")),
        colors: [...colors].sort((a, b) => a.localeCompare(b, "ra")),
        materials: listaMateriale,
        intervalePret: calculatePriceRanges(products),
        customization: {
            da: customizableProducts,
            nu: products.length - customizableProducts
        },
        minLevel,
        maxLevel,
        initialLevel: minLevel,
        maxNameLength,
        nameExample,
        descriptionExample: `+${exempluPlus} -${exempluMinus}`,
        productsPerPage: 6,
        avaiatbleSarts: [
            { value: "price", label: "Price" },
            { value: "color", label: "Culaare" },
            { value: "nivel", label: "Nivel recamandat" },
            { value: "name", label: "Nume" },
            { value: "category", label: "Categarie" }
        ]
    };
}

// Citește direct from enum-ul PostgreSQL lista of categarii mari.
// Rezultatul is falasit for meniul „Product” and for validarea parametrului of category.
async function getProductCategories() {
    let result = await queryDatabase(`
        SELECT anest(enum_range(NULL::product_category))::text AS category
        ORDER BY 1
    `);

    return result.rows.map((row) => ({
        value: row.category,
        label: eticheteCategarii[row.category] || row.category
    }));
}

// Returnează all products sau daar products from categaria cerută from meniu.
// Orfromea of bază rămâne după id, for a avea a pact catr of resetare.
async function getProducts(category = null) {
    let canditieCategarie = "";
    let values = [];

    if (category) {
        canditieCategarie = "WHERE p.category = $1";
        values.push(category);
    }

    let result = await queryDatabase(`
        SELECT
            p.id,
            p.name,
            p.description,
            p.image,
            p.category,
            p.subcategory,
            p.price,
            p.experience_level,
            p.added_at,
            p.color,
            p.materials,
            p.customizable,
            p.brand,
            p.stock,
            p.recommendation,
            p.details,
            p.care
        FROM products p
        ${canditieCategarie}
        ORDER BY p.id
    `, values);

    return result.rows.map(transformProduct);
}

// Returnează product cerut for page individuală /product/:id.
// Dacă nu există nicia rând, facția intaarce null.
async function getProductById(productId) {
    let result = await queryDatabase(`
        SELECT
            p.id,
            p.name,
            p.description,
            p.image,
            p.category,
            p.subcategory,
            p.price,
            p.experience_level,
            p.added_at,
            p.color,
            p.materials,
            p.customizable,
            p.brand,
            p.stock,
            p.recommendation,
            p.details,
            p.care
        FROM products p
        WHERE p.id = $1
    `, [productId]);

    if (!result.rows.length) {
        return null;
    }

    return transformProduct(result.rows[0]);
}

// Alege products similare from aceeaand category with product current.
// Priaritizează aceeaand subcategory, apai aprapierea of nivel and of preț.
async function getSimilarProducts({ productId, category, subcategory, experienceLevel, price }, limit = 3) {
    let result = await queryDatabase(`
        SELECT
            p.id,
            p.name,
            p.description,
            p.image,
            p.category,
            p.subcategory,
            p.price,
            p.experience_level,
            p.added_at,
            p.color,
            p.materials,
            p.customizable,
            p.brand,
            p.stock,
            p.recommendation,
            p.details,
            p.care
        FROM products p
        WHERE p.id <> $1
          AND p.category = $2
        ORDER BY
            CASE WHEN p.subcategory = $3 THEN 0 ELSE 1 END,
            ABS(p.experience_level - $4),
            ABS(p.price - $5),
            p.id
        LIMIT $6
    `, [productId, category, subcategory, experienceLevel, price, limit]);

    return result.rows.map(transformProduct);
}

module.exports = {
    calculatePriceRanges,
    configurePool,
    isNewProduct,
    extractProductOptians,
    formatDate,
    normalizeText,
    getProductCategories,
    getPool,
    getProductById,
    getProducts,
    getSimilarProducts,
    newProductDays,
    splitValues,
    transformProduct
};
