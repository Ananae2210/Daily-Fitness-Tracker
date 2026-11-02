/**
 * Leaderboard API (Vercel serverless function).
 *
 * Storage: Upstash Redis over its REST API. Connect "Upstash Redis" from the Vercel
 * Marketplace (Storage tab) and Vercel injects KV_REST_API_URL / KV_REST_API_TOKEN
 * (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN). Without them, every call
 * answers 503 and the app shows a "not set up" message.
 *
 * Only public stats are ever sent here: display name, goal direction, scores and best lifts.
 */

export const PUBLIC_BOARD = 'PUBLIC';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_BOARD_MEMBERS = 500;
const MAX_BOARDS_PER_MEMBER = 20;

interface Member {
  id: string;
  name: string;
  direction: 'lose' | 'gain';
  lockIn: number;       // 0..1, last 7 days
  streak: number;       // days
  goalPct: number;      // 0..1
  daysOnTarget: number; // 0..7, days with all three targets hit
  prs: [string, number][];
  updatedAt: string;
  tokenHash: string;
}
interface Board { code: string; name: string; createdAt: string; ownerId: string | null }

/* ---------------- storage ---------------- */

type Cmd = (string | number)[];
interface Store { run(cmds: Cmd[]): Promise<unknown[]> }

const memory = new Map<string, string | Set<string>>();
const memoryStore: Store = {
  async run(cmds) {
    return cmds.map(([op, key, ...args]) => {
      const k = String(key);
      switch (op) {
        case 'GET': { const v = memory.get(k); return typeof v === 'string' ? v : null; }
        case 'SET': memory.set(k, String(args[0])); return 'OK';
        case 'DEL': return memory.delete(k) ? 1 : 0;
        case 'SADD': { const s = (memory.get(k) as Set<string>) ?? new Set(); args.forEach((a) => s.add(String(a))); memory.set(k, s); return 1; }
        case 'SREM': { const s = memory.get(k) as Set<string> | undefined; args.forEach((a) => s?.delete(String(a))); return 1; }
        case 'SMEMBERS': return [...((memory.get(k) as Set<string>) ?? [])];
        case 'SCARD': return ((memory.get(k) as Set<string>) ?? new Set()).size;
        case 'MGET': return [k, ...args.map(String)].map((x) => { const v = memory.get(x); return typeof v === 'string' ? v : null; });
        default: throw new Error(`memory store: ${op} not supported`);
      }
    });
  },
};

const getStore = (): Store | null => {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return {
      async run(cmds) {
        const res = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds),
        });
        if (!res.ok) throw new Error(`redis ${res.status}`);
        const out = (await res.json()) as { result?: unknown; error?: string }[];
        return out.map((r) => { if (r.error) throw new Error(r.error); return r.result; });
      },
    };
  }
  if (process.env.LEADERBOARD_DEV_MEMORY === '1') return memoryStore;
  return null;
};

/* ---------------- helpers ---------------- */

class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const sha256 = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
const clamp = (v: unknown, lo: number, hi: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };
const isId = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{12,40}$/.test(v);
const normCode = (v: unknown) => clean(v, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');

const publicMember = ({ tokenHash: _t, ...m }: Member) => m;

async function getMember(db: Store, id: string) {
  const [raw] = await db.run([['GET', `member:${id}`]]);
  return raw ? (JSON.parse(raw as string) as Member) : null;
}

async function authed(db: Store, body: Record<string, unknown>) {
  if (!isId(body.id) || typeof body.token !== 'string' || body.token.length < 16) throw new HttpError(400, 'Missing id or token');
  const m = await getMember(db, body.id);
  if (!m) throw new HttpError(404, 'Not on the leaderboard yet');
  if (m.tokenHash !== (await sha256(body.token))) throw new HttpError(403, 'Wrong token');
  return m;
}

async function getBoard(db: Store, code: string): Promise<Board | null> {
  if (code === PUBLIC_BOARD) return { code, name: 'Everyone', createdAt: '', ownerId: null };
  const [raw] = await db.run([['GET', `board:${code}`]]);
  return raw ? (JSON.parse(raw as string) as Board) : null;
}

async function joinBoard(db: Store, m: Member, code: string) {
  const board = await getBoard(db, code);
  if (!board) throw new HttpError(404, 'No board with that code');
  const [count, mine] = await db.run([['SCARD', `board:${code}:members`], ['SCARD', `member:${m.id}:boards`]]);
  if ((count as number) >= MAX_BOARD_MEMBERS) throw new HttpError(409, 'That board is full');
  if ((mine as number) >= MAX_BOARDS_PER_MEMBER) throw new HttpError(409, 'You are on too many boards');
  await db.run([['SADD', `board:${code}:members`, m.id], ['SADD', `member:${m.id}:boards`, code]]);
  return board;
}

/* ---------------- handlers ---------------- */

export async function GET(req: Request) {
  const db = getStore();
  if (!db) return json({ error: 'Leaderboards are not set up on this deployment yet.' }, 503);
  try {
    const code = normCode(new URL(req.url).searchParams.get('code'));
    const board = await getBoard(db, code);
    if (!board) return json({ error: 'No board with that code' }, 404);
    const [ids] = await db.run([['SMEMBERS', `board:${code}:members`]]);
    const list = ids as string[];
    const raws = list.length ? ((await db.run([['MGET', ...list.map((id) => `member:${id}`)]]))[0] as (string | null)[]) : [];
    const members = raws.filter(Boolean).map((r) => publicMember(JSON.parse(r as string) as Member));
    return json({ board, members });
  } catch (e) {
    return json({ error: e instanceof HttpError ? e.message : 'Server error' }, e instanceof HttpError ? e.status : 500);
  }
}

export async function POST(req: Request) {
  const db = getStore();
  if (!db) return json({ error: 'Leaderboards are not set up on this deployment yet.' }, 503);
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    switch (body.action) {
      case 'sync': {
        if (!isId(body.id) || typeof body.token !== 'string' || body.token.length < 16) throw new HttpError(400, 'Missing id or token');
        const existing = await getMember(db, body.id);
        const hash = await sha256(body.token);
        if (existing && existing.tokenHash !== hash) throw new HttpError(403, 'Wrong token');
        const s = (body.stats ?? {}) as Record<string, unknown>;
        const prs = Array.isArray(s.prs) ? s.prs.slice(0, 8)
          .filter((p): p is [string, number] => Array.isArray(p) && typeof p[0] === 'string')
          .map(([n, v]) => [clean(n, 32), Math.round(clamp(v, 0, 1000) * 10) / 10] as [string, number]) : [];
        const m: Member = {
          id: body.id, tokenHash: hash, updatedAt: new Date().toISOString(),
          name: clean(s.name, 24) || 'Anonymous',
          direction: s.direction === 'gain' ? 'gain' : 'lose',
          lockIn: clamp(s.lockIn, 0, 1), streak: Math.round(clamp(s.streak, 0, 100000)),
          goalPct: clamp(s.goalPct, 0, 1), daysOnTarget: Math.round(clamp(s.daysOnTarget, 0, 7)), prs,
        };
        await db.run([['SET', `member:${m.id}`, JSON.stringify(m)]]);
        const [boards] = await db.run([['SMEMBERS', `member:${m.id}:boards`]]);
        return json({ ok: true, boards });
      }
      case 'create': {
        const m = await authed(db, body);
        let code = newCode();
        for (let i = 0; i < 5 && (await getBoard(db, code)); i++) code = newCode();
        const board: Board = { code, name: clean(body.name, 32) || `${m.name}'s board`, createdAt: new Date().toISOString(), ownerId: m.id };
        await db.run([['SET', `board:${code}`, JSON.stringify(board)]]);
        await joinBoard(db, m, code);
        return json({ board });
      }
      case 'join': {
        const m = await authed(db, body);
        return json({ board: await joinBoard(db, m, normCode(body.code)) });
      }
      case 'leave': {
        const m = await authed(db, body);
        const code = normCode(body.code);
        await db.run([['SREM', `board:${code}:members`, m.id], ['SREM', `member:${m.id}:boards`, code]]);
        return json({ ok: true });
      }
      case 'delete': {
        const m = await authed(db, body);
        const [boards] = await db.run([['SMEMBERS', `member:${m.id}:boards`]]);
        await db.run([
          ...(boards as string[]).map((c) => ['SREM', `board:${c}:members`, m.id] as Cmd),
          ['DEL', `member:${m.id}:boards`], ['DEL', `member:${m.id}`],
        ]);
        return json({ ok: true });
      }
      default:
        throw new HttpError(400, 'Unknown action');
    }
  } catch (e) {
    return json({ error: e instanceof HttpError ? e.message : 'Server error' }, e instanceof HttpError ? e.status : 500);
  }
}
