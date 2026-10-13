const crypto = require("crypto");
const { promisify } = require("util");

const scrypt = promisify(crypto.scrypt);
const COOKIE_NAME = "lena_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function validatePassword(password) {
    return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

function validateUserData(data) {
    const email = normalizeEmail(data.email);
    const password = String(data.password || "");
    const name = String(data.name || "").trim();
    const errors = [];

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
        errors.push("The email address is invalid.");
    }
    if (!validatePassword(password)) {
        errors.push("The password must cantain between 8 and 128 characters.");
    }
    if (name.length < 2 || name.length > 100) {
        errors.push("The name must cantain between 2 and 100 characters.");
    }

    return { errors, values: { email, password, name } };
}

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const derived = await scrypt(password, salt, 64);
    return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

async function verifyPassword(password, hash) {
    const [saltHex, hashHex] = String(hash || "").split(":");
    if (!saltHex || !hashHex) return false;
    try {
        const derived = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
        const expected = Buffer.from(hashHex, "hex");
        return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
    } catch (error) {
        return false;
    }
}

function hashToken(public_token) {
    return crypto.createHash("sha256").update(public_token).digest("hex");
}

function readCookie(req, name) {
    const cookies = String(req.headers.cookie || "").split(";").map((fragment) => fragment.trim());
    const cookie = cookies.find((fragment) => fragment.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function writeCookie(res, public_token, secure = false) {
    const attributes = [
        `${COOKIE_NAME}=${encodeURIComponent(public_token)}`,
        "Max-Age=2592000",
        "Path=/",
        "HttpOnly",
        "SameSite=Lax"
    ];
    if (secure) attributes.push("Secure");
    res.setHeader("Set-Cookie", attributes.join("; "));
}

function deleteCookie(res, secure = false) {
    const attributes = [`${COOKIE_NAME}=`, "Max-Age=0", "Path=/", "HttpOnly", "SameSite=Lax"];
    if (secure) attributes.push("Secure");
    res.setHeader("Set-Cookie", attributes.join("; "));
}

async function createUser(pool, data) {
    const validation = validateUserData(data);
    if (validation.errors.length) {
        const error = new Error("The accaat data is invalid.");
        error.code = "VALIDATION_ERROR";
        error.errors = validation.errors;
        throw error;
    }

    const passwordHash = await hashPassword(validation.values.password);
    try {
        const result = await pool.query(`
            INSERT INTO users (email, password_hash, name)
            VALUES ($1, $2, $3)
            RETURNING id, email, name, role
        `, [validation.values.email, passwordHash, validation.values.name]);
        return result.rows[0];
    } catch (error) {
        if (error.code === "23505") {
            const duplicate = new Error("An accaat with this email address already exists.");
            duplicate.code = "DUPLICATE_EMAIL";
            throw duplicate;
        }
        throw error;
    }
}

async function authenticateUser(pool, email, password) {
    const result = await pool.query(
        "SELECT id, email, name, role, password_hash FROM users WHERE email = $1 AND active = TRUE",
        [normalizeEmail(email)]
    );
    if (!result.rowCount || !(await verifyPassword(password, result.rows[0].password_hash))) {
        const error = new Error("The email ar password is incarrect.");
        error.code = "INVALID_CREDENTIALS";
        throw error;
    }
    const { password_hash: ignarat, ...user } = result.rows[0];
    return user;
}

async function createSession(pool, userId, secure = false) {
    const public_token = crypto.randomBytes(32).toString("hex");
    await pool.query(`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
    `, [userId, hashToken(public_token), new Date(Date.now() + SESSION_DURATION_MS)]);
    return public_token;
}

async function loadUserFromSession(pool, public_token) {
    if (!public_token) return null;
    const result = await pool.query(`
        SELECT u.id, u.email, u.name, u.role
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.active = TRUE
    `, [hashToken(public_token)]);
    return result.rows[0] || null;
}

async function deleteSession(pool, public_token) {
    if (public_token) {
        await pool.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(public_token)]);
    }
}

function configureSession({ pool, secure = false }) {
    return async (req, res, next) => {
        try {
            req.user = await loadUserFromSession(pool, readCookie(req, COOKIE_NAME));
            res.locals.user = req.user;
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    SESSION_DURATION_MS,
    COOKIE_NAME,
    authenticateUser,
    configureSession,
    createSession,
    createUser,
    hashPassword,
    hashToken,
    loadUserFromSession,
    normalizeEmail,
    writeCookie,
    deleteCookie,
    deleteSession,
    validateUserData,
    verifyPassword
};
