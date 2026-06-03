function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function isValidAuthor(value) {
  return /^[A-Za-z0-9_.-]{1,80}$/.test(value);
}

function isValidSkillId(value) {
  return /^[A-Za-z0-9_.-]{1,140}$/.test(value);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS source_click_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL,
      skill_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      referer TEXT,
      country TEXT
    )
  `).run();

  await db.prepare(`
    CREATE TABLE IF NOT EXISTS author_source_clicks (
      author TEXT PRIMARY KEY,
      source_clicks INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_source_click_events_author_created
    ON source_click_events(author, created_at)
  `).run();
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://summerai.cc",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ ok: false, error: "D1 binding DB is not configured" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, 400);
  }

  const author = cleanText(body.author, 80);
  const skillId = cleanText(body.skill_id, 140);
  const sourceUrl = cleanText(body.source_url, 500);

  if (!isValidAuthor(author) || !isValidSkillId(skillId) || !isValidHttpUrl(sourceUrl)) {
    return json({ ok: false, error: "Invalid click payload" }, 400);
  }

  const userAgent = cleanText(request.headers.get("user-agent"), 300);
  const referer = cleanText(request.headers.get("referer"), 500);
  const country = cleanText(request.cf?.country, 16);

  await ensureSchema(env.DB);

  await env.DB.prepare(`
    INSERT INTO source_click_events (author, skill_id, source_url, user_agent, referer, country)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(author, skillId, sourceUrl, userAgent, referer, country).run();

  await env.DB.prepare(`
    INSERT INTO author_source_clicks (author, source_clicks, updated_at)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(author) DO UPDATE SET
      source_clicks = source_clicks + 1,
      updated_at = CURRENT_TIMESTAMP
  `).bind(author).run();

  return json({ ok: true });
}
