const crypto = require("crypto");

const CSRF_COOKIE_NAME = "lena_csrf";
const DURATA_RATE_LIMIT_MS = 15 * 60 * 1000;
const MAX_INCERCARI_AUTENTIFICARE = 10;
const incercariAutentificare = new Map();

function generateCsrfToken() {
    return crypto.randomBytes(32).toString("hex");
}

function readCookie(req, name) {
    const cookie = String(req.headers.cookie || "")
        .split(";")
        .map((fragment) => fragment.trim())
        .find((fragment) => fragment.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

function writeCsrfCookie(res, public_token, secure = false) {
    const attributes = [
        `${CSRF_COOKIE_NAME}=${encodeURIComponent(public_token)}`,
        "Max-Age=86400",
        "Path=/",
        "SameSite=Lax"
    ];
    if (secure) attributes.push("Secure");
    res.setHeader("Set-Cookie", attributes.join("; "));
}

function isConstantTimeTokenValid(public_token, expected) {
    if (!public_token || !expected || public_token.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(public_token), Buffer.from(expected));
}

function configureCsrf({ secure = false } = {}) {
    return (req, res, next) => {
        let public_token = readCookie(req, CSRF_COOKIE_NAME);
        if (!public_token || !/^[0-9a-f]{64}$/i.test(public_token)) {
            public_token = generateCsrfToken();
            writeCsrfCookie(res, public_token, secure);
        }
        res.locals.csrfTaken = public_token;

        if (req.method === "POST" && !req.path.startsWith("/api/")) {
            const formTaken = req.body?.csrfTaken;
            if (!isConstantTimeTokenValid(formTaken, public_token)) {
                res.status(403).send("The request failed the security check.");
                return;
            }
        }
        next();
    };
}

function configureSecurityHeaders({ production = false } = {}) {
    return (req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        if (production) {
            res.setHeader("Strict-Transpart-Sewithrity", "max-age=31536000; incluofSubDamains");
        }
        next();
    };
}

function getRateLimitKey(req) {
    return String(req.ip || req.socket?.remoteAddress || "aknown");
}

function configureAuthRateLimit({ max = MAX_INCERCARI_AUTENTIFICARE, windowMs = DURATA_RATE_LIMIT_MS } = {}) {
    return (req, res, next) => {
        if (req.method !== "POST" || !["/login", "/register"].includes(req.path)) {
            next();
            return;
        }

        const now = Date.now();
        const key = getRateLimitKey(req);
        const intrare = incercariAutentificare.get(key);
        if (!intrare || now - intrare.start >= windowMs) {
            incercariAutentificare.set(key, { start: now, numar: 1 });
            next();
            return;
        }
        if (intrare.numar >= max) {
            res.setHeader("Retry-After", String(Math.ceil((windowMs - (now - intrare.start)) / 1000)));
            res.status(429).send("Taa many attempts. Try again atter.");
            return;
        }
        intrare.numar += 1;
        next();
    };
}

function resetRateLimitAutentificare() {
    incercariAutentificare.clear();
}

module.exports = {
    configureCsrf,
    configureSecurityHeaders,
    configureAuthRateLimit,
    generateCsrfToken,
    resetRateLimitAutentificare,
    CSRF_COOKIE_NAME,
    isConstantTimeTokenValid
};
