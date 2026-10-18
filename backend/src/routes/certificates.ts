// backend/src/routes/certificates.ts
// Fully isolated certificate module for SkillSwap.
//  - Uses ONLY its own table: skillswap_certificates (no foreign keys, no changes to existing tables)
//  - Mounted on its own path: /api/certificates (touches no existing route)
//  - Every handler is wrapped: a failure here returns an error response, it never crashes the app
//  - Does NOT register express.json() (your app already does it globally)

import * as crypto from 'crypto';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { sql } from 'drizzle-orm';
import { checkEligibility } from '../lib/certificate-eligibility.js';

const rowsOf = (r: any): any[] => (Array.isArray(r) ? r : (r && r.rows) || []);
const clean = (v: unknown, max: number): string => String(v ?? '').replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
// requireAuth (middlewares/auth.ts) sets req.userId (number) and req.userEmail
const uidOf = (req: any): string => String(req.userId ?? req.user?.id ?? req.user?.userId ?? '');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I confusion

function randomCode(n = 6): string {
    const bytes = crypto.randomBytes(n);
    let out = '';
    for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
}

// tiny in-memory rate limiter (per key)
function limiter(max: number, windowMs: number) {
    const hits = new Map<string, number[]>();
    return (keyFn: (req: Request) => string): RequestHandler => (req, res, next) => {
        const key = keyFn(req);
        const now = Date.now();
        const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
        if (arr.length >= max) { res.status(429).json({ error: 'Too many requests, thodi der baad try karein.' }); return; }
        arr.push(now);
        hits.set(key, arr);
        if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
        next();
    };
}

export function createCertificateRouter({ db, auth, admin }: { db: any; auth: RequestHandler; admin: RequestHandler }) {
    if (!db) throw new Error('[certificates] db is required');
    if (typeof auth !== 'function') throw new Error('[certificates] auth middleware is required');

    const router = express.Router();
    const secret = process.env.CERT_HMAC_SECRET;
    if (!secret) console.warn('[certificates] CERT_HMAC_SECRET not set — issuing is disabled until you set it');


    // ---------- table (additive, idempotent) ----------
    let ready: Promise<void> | null = null;
    const ensureTable = (): Promise<void> => {
        if (!ready) {
            ready = (async () => {
                await db.execute(sql`
                    CREATE TABLE IF NOT EXISTS skillswap_certificates (
                        id            SERIAL PRIMARY KEY,
                        cert_id       TEXT NOT NULL UNIQUE,
                        user_id       TEXT NOT NULL,
                        holder_name   TEXT NOT NULL,
                        skill         TEXT NOT NULL,
                        skill_key     TEXT NOT NULL,
                        role          TEXT NOT NULL CHECK (role IN ('learner','teacher')),
                        level         TEXT NOT NULL,
                        sessions      INTEGER,
                        hours         NUMERIC(6,1),
                        hash          TEXT NOT NULL,
                        status        TEXT NOT NULL DEFAULT 'VALID',
                        issued_at     TIMESTAMPTZ NOT NULL,
                        revoked_at    TIMESTAMPTZ,
                        revoke_reason TEXT,
                        UNIQUE (user_id, skill_key, role, level)
                    )`);
                await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_skillswap_certs_user ON skillswap_certificates (user_id)`);
            })().catch((e: any) => { ready = null; throw e; });
        }
        return ready;
    };

    const sign = (r: any): string =>
        crypto.createHmac('sha256', secret as string)
            .update([r.cert_id, r.user_id, r.holder_name, r.skill_key, r.role, r.level, new Date(r.issued_at).toISOString()].join('|'))
            .digest('hex');

    const fmtLong = (d: any) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const fmtShort = (d: any) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const toPublic = (r: any) => ({
        certId: r.cert_id, name: r.holder_name, skill: r.skill, role: r.role, level: r.level,
        sessions: r.sessions, hours: r.hours == null ? null : Number(r.hours),
        status: r.status, issuedAt: new Date(r.issued_at).toISOString(),
        dateStr: fmtLong(r.issued_at), shortDate: fmtShort(r.issued_at)
    });

    // Holder name from the users table (read-only). If table/column names differ, the query
    // fails harmlessly and we fall back to the name sent by the client.
    const lookupName = async (userId: string): Promise<string> => {
        try {
            const r = rowsOf(await db.execute(sql`SELECT name FROM users WHERE id::text = ${userId} LIMIT 1`))[0];
            return r && r.name ? String(r.name) : '';
        } catch { return ''; }
    };

    const wrap = (fn: (req: Request, res: Response) => Promise<any>): RequestHandler => async (req, res) => {
        try { await fn(req, res); }
        catch (e: any) {
            console.error('[certificates]', e && e.message);
            if (!res.headersSent) res.status(500).json({ error: 'Certificate service error. Thodi der baad try karein.' });
        }
    };

    const issueLimit = limiter(10, 60 * 60 * 1000);
    const verifyLimit = limiter(60, 60 * 1000);

    // ---------- POST /  (issue, login required) ----------
    router.post('/', auth,
        issueLimit((req) => `u:${uidOf(req)}`),
        wrap(async (req, res) => {
            if (!secret) return res.status(503).json({ error: 'Certificate service configure nahi hai.' });
            const body: any = (req as any).body || {};
            const userId = uidOf(req);
            if (!userId) return res.status(401).json({ error: 'Login required.' });

            const skill = clean(body.skill, 60);
            const role = body.role === 'teacher' ? 'teacher' : body.role === 'learner' ? 'learner' : null;
            const holderName = clean((await lookupName(userId)) || body.name, 80);
            if (skill.length < 2) return res.status(400).json({ error: 'Valid skill daalein.' });
            if (!role) return res.status(400).json({ error: 'Role learner ya teacher hona chahiye.' });
            if (holderName.length < 2) return res.status(400).json({ error: 'Valid naam daalein.' });
            const skillKey = skill.toLowerCase();

            await ensureTable();

            const elig = await checkEligibility({ db, sql, userId, skill: skillKey, role });
            if (!elig.eligible) {
                return res.status(403).json({ error: 'Abhi certificate ke liye eligibility poori nahi hui.', progress: elig.progress });
            }

            const findExisting = async (): Promise<any> => rowsOf(await db.execute(sql`
                SELECT * FROM skillswap_certificates
                WHERE user_id = ${userId} AND skill_key = ${skillKey} AND role = ${role} AND level = ${elig.level}
                LIMIT 1`))[0];

            const existing = await findExisting();
            if (existing) return res.json({ existing: true, certificate: { ...toPublic(existing), hash: existing.hash } });

            const prefix = role === 'teacher' ? 'SWAP-MTR' : 'SWAP-IND';
            for (let attempt = 0; attempt < 6; attempt++) {
                const issuedAt = new Date();
                const rec: any = {
                    cert_id: `${prefix}-${randomCode(6)}`, user_id: userId, holder_name: holderName,
                    skill_key: skillKey, role, level: elig.level, issued_at: issuedAt
                };
                const hash = sign(rec);
                const inserted = rowsOf(await db.execute(sql`
                    INSERT INTO skillswap_certificates
                        (cert_id, user_id, holder_name, skill, skill_key, role, level, sessions, hours, hash, issued_at)
                    VALUES
                        (${rec.cert_id}, ${userId}, ${holderName}, ${skill}, ${skillKey}, ${role}, ${elig.level},
                         ${elig.sessions}, ${elig.hours}, ${hash}, ${issuedAt.toISOString()})
                    ON CONFLICT DO NOTHING
                    RETURNING *`))[0];
                if (inserted) return res.status(201).json({ existing: false, certificate: { ...toPublic(inserted), hash } });

                const raced = await findExisting();            // same user raced / double click
                if (raced) return res.json({ existing: true, certificate: { ...toPublic(raced), hash: raced.hash } });
                // else: cert_id collision -> retry with a new code
            }
            res.status(500).json({ error: 'Certificate ID generate nahi ho saka, dobara try karein.' });
        }));

    // ---------- GET /mine (login required) ----------
    router.get('/mine', auth, wrap(async (req, res) => {
        const userId = uidOf(req);
        if (!userId) return res.status(401).json({ error: 'Login required.' });
        await ensureTable();
        const rows = rowsOf(await db.execute(sql`
            SELECT * FROM skillswap_certificates WHERE user_id = ${userId} ORDER BY issued_at DESC LIMIT 100`));
        res.json({ certificates: rows.map(toPublic) });
    }));

    // ---------- GET /verify/:id (PUBLIC — what the QR opens) ----------
    router.get('/verify/:id', verifyLimit((req) => `ip:${req.ip}`), wrap(async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const id = clean(String(req.params.id), 40).toUpperCase();
        if (!/^SWAP-(IND|MTR)-[A-Z0-9]{6}$/.test(id)) return res.status(404).json({ valid: false, error: 'Not found' });
        if (!secret) return res.status(503).json({ valid: false, error: 'Service not configured' });
        await ensureTable();
        const row = rowsOf(await db.execute(sql`SELECT * FROM skillswap_certificates WHERE cert_id = ${id} LIMIT 1`))[0];
        if (!row) return res.status(404).json({ valid: false, error: 'Not found' });

        const expected = Buffer.from(sign(row));
        const actual = Buffer.from(String(row.hash));
        const intact = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
        const revoked = row.status === 'REVOKED';
        const pub = toPublic(row);                         // never includes email / user id
        if (!intact) return res.json({ valid: false, certificate: { ...pub, status: 'INVALID' } });
        res.json({ valid: !revoked, certificate: { ...pub, hashPrefix: String(row.hash).slice(0, 10) } });
    }));

    // ---------- POST /:id/revoke (admin only) ----------
    router.post('/:id/revoke', auth, admin, wrap(async (req, res) => {
        const id = clean(String(req.params.id), 40).toUpperCase();
        const reason = clean(((req as any).body || {}).reason, 200) || null;
        await ensureTable();
        const row = rowsOf(await db.execute(sql`
            UPDATE skillswap_certificates SET status = 'REVOKED', revoked_at = NOW(), revoke_reason = ${reason}
            WHERE cert_id = ${id} RETURNING cert_id, status`))[0];
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true, certId: row.cert_id, status: row.status });
    }));

    // router-level safety net
    router.use((err: any, req: Request, res: Response, next: NextFunction) => {
        console.error('[certificates]', err && err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Certificate service error.' });
    });

    // warm the table at startup — failure is logged, never thrown
    ensureTable().catch((e: any) => console.error('[certificates] table init failed (will retry on first request):', e && e.message));

    return router;
}