#!/usr/bin/env node
// Crust & Crumb roster agent (P0).
//
// Reads the Skool member directory from Henry's OWN logged-in Chrome and posts
// it to the Helper's ingest-roster endpoint. It behaves like Henry working by
// hand: it rides his existing browser session, moves at a human pace, and
// stops loudly the moment the page looks wrong instead of guessing or
// hammering. It never stores a password and never posts an empty read.
//
// Connect mode: Chrome must be started with remote debugging on, using a
// profile that is signed in to Skool. See README.md.
//
// Usage:
//   node read-roster.mjs --probe     # inspect the page, confirm selectors, no post
//   node read-roster.mjs --dry-run   # full read + build payload, print it, no post
//   node read-roster.mjs             # full read + post to ingest-roster
//
// Config comes from environment variables (see .env.example). Run with
// `node --env-file=.env read-roster.mjs`.

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = new Set(process.argv.slice(2));
const PROBE = argv.has("--probe");
const DRY_RUN = argv.has("--dry-run");

const cfg = {
  cdp: process.env.CHROME_CDP_URL || "http://localhost:9222",
  communityUrl: process.env.SKOOL_MEMBERS_URL ||
    "https://www.skool.com/crust-crumb-academy-7621/-/members",
  ingestUrl: process.env.INGEST_ROSTER_URL ||
    "https://anponqqhjugwflakydsf.supabase.co/functions/v1/ingest-roster",
  apiKey: process.env.INGEST_API_KEY || "",
  maxPages: Number(process.env.ROSTER_MAX_PAGES || 80),
  minDelayMs: Number(process.env.ROSTER_MIN_DELAY_MS || 1200),
  maxDelayMs: Number(process.env.ROSTER_MAX_DELAY_MS || 2800),
  fullRoster: process.env.ROSTER_FULL !== "false", // default true
  navTimeoutMs: Number(process.env.ROSTER_NAV_TIMEOUT_MS || 30000),
};

// --partial forces a non-reconciling run (inserts + updates, flags nobody
// missing). Use it for the first sync against a CSV-seeded table, before
// usernames are backfilled. --full forces reconciliation on.
if (argv.has("--partial")) cfg.fullRoster = false;
if (argv.has("--full")) cfg.fullRoster = true;

const selectors = JSON.parse(
  readFileSync(join(__dirname, "selectors.json"), "utf8"),
);
const CARD = selectors.memberCard;

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}
function fail(msg, extra) {
  console.error("\n*** ROSTER READ FAILED ***");
  console.error(new Date().toISOString(), msg);
  if (extra) console.error(extra);
  console.error("Nothing was posted. Fix the cause (often selectors.json) and re-run.\n");
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const humanDelay = () =>
  sleep(cfg.minDelayMs + Math.floor(Math.random() * (cfg.maxDelayMs - cfg.minDelayMs)));

// ---- date / count normalization -----------------------------------------
// Skool shows relative recency ("6h ago", "2d ago", "Online now") and absolute
// join dates ("Joined Jun 14, 2026"). Map anything within a day to today, so
// the most-active members are not misread as having no activity data.
function toIsoDate(text) {
  if (!text) return null;
  const t = String(text).toLowerCase().trim();
  const now = new Date();
  const iso = (d) => d.toISOString().split("T")[0];
  let m;
  if (/(online|just now|today|second|sec ago)/.test(t)) return iso(now);
  if (/(\d+)\s*h(?:rs?|ours?)?\s*ago/.test(t)) return iso(now); // hours -> today
  if (/(\d+)\s*mo(?:nth)?s?\s*ago/.test(t)) {                    // months (before minutes)
    m = t.match(/(\d+)\s*mo/); now.setMonth(now.getMonth() - +m[1]); return iso(now);
  }
  if (/(\d+)\s*m(?:in(?:ute)?s?)?\s*ago/.test(t)) return iso(now); // minutes -> today
  if ((m = t.match(/(\d+)\s*d(?:ays?)?\s*ago/))) { now.setDate(now.getDate() - +m[1]); return iso(now); }
  if ((m = t.match(/(\d+)\s*w(?:eeks?)?\s*ago/))) { now.setDate(now.getDate() - +m[1] * 7); return iso(now); }
  if ((m = t.match(/(\d+)\s*y(?:ears?)?\s*ago/))) { now.setFullYear(now.getFullYear() - +m[1]); return iso(now); }
  const p = new Date(text); // "Jun 14, 2026"
  return isNaN(p.getTime()) ? null : iso(p);
}

// ---- connection ----------------------------------------------------------
async function connect() {
  let browser;
  try {
    browser = await chromium.connectOverCDP(cfg.cdp);
  } catch (e) {
    fail(
      `Could not connect to Chrome at ${cfg.cdp}. Start Chrome with remote debugging and a Skool-signed-in profile first (see README.md).`,
      e.message,
    );
  }
  const contexts = browser.contexts();
  if (!contexts.length) fail("Chrome has no open browser context.");
  const context = contexts[0];
  // Reuse the members tab if it is already open, else open one.
  let page = context.pages().find((p) => p.url().includes("/-/members"));
  if (!page) page = await context.newPage();
  page.setDefaultTimeout(cfg.navTimeoutMs);
  return { browser, page };
}

async function ensureLoaded(page) {
  // Always start from a clean page 1. Reusing whatever page the tab was left
  // on (e.g. the last page from a prior run) would read only that page.
  await page.goto(cfg.communityUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(CARD, { timeout: cfg.navTimeoutMs }).catch(() => {});
  const hasCards = await page.$(CARD);
  if (!hasCards) {
    fail(
      "No member cards on the page. Either not signed in to Skool in this Chrome profile, or the card selector drifted. Run --probe.",
    );
  }
}

// ---- extraction ----------------------------------------------------------
// Parse each card from its visible text + profile link. Line-based parsing is
// resilient to Skool's hashed class names.
async function extractVisible(page) {
  return page.$$eval(
    CARD,
    (cards, profileSel) => {
      return cards.map((el) => {
        const link = el.querySelector(profileSel);
        const href = link ? link.getAttribute("href") : null;
        let username = null;
        if (href) {
          const m = href.match(/^\/@?([^/?#]+)/);
          if (m) username = m[1];
        }
        const lines = (el.innerText || "")
          .split("\n").map((s) => s.trim()).filter(Boolean);
        const hi = lines.findIndex((l) => l.startsWith("@"));
        const name = hi > 0 ? lines[hi - 1] : (lines[0] || "");
        if (!username && hi >= 0) username = lines[hi].slice(1);
        let activeText = null, joinedText = null;
        for (const l of lines) {
          if (!activeText && /^(active |online)/i.test(l)) activeText = l;
          const jm = l.match(/^Joined\s+([A-Z][a-z]{2,}\s+\d{1,2},\s+\d{4})$/);
          if (jm) joinedText = jm[1];
        }
        return { name, skoolUsername: username, profileUrl: href, activeText, joinedText };
      });
    },
    selectors.profileLink,
  );
}

function normalize(raw) {
  return {
    // Skool renders the gap between first and last name as a non-breaking
    // space (char 160). Collapse all whitespace to regular single spaces so
    // names match the regular-space names already in the table.
    name: (raw.name || "").replace(/\s+/g, " ").trim(),
    skoolUsername: raw.skoolUsername || null,
    profileUrl: raw.profileUrl
      ? (raw.profileUrl.startsWith("http") ? raw.profileUrl : "https://www.skool.com" + raw.profileUrl)
      : null,
    joinDate: toIsoDate(raw.joinedText),
    lastActive: toIsoDate(raw.activeText),
    // posts/comments are not shown on the directory; left undefined on purpose
    // so the server's partial update never zeroes a real count.
  };
}

// ---- pagination ----------------------------------------------------------
async function firstHandle(page) {
  return page.$eval(
    CARD,
    (el, profileSel) => {
      const link = el.querySelector(profileSel);
      return link ? link.getAttribute("href") : "";
    },
    selectors.profileLink,
  ).catch(() => "");
}

async function readAll(page) {
  const seen = new Map();
  let stagnant = 0;

  for (let i = 0; i < cfg.maxPages; i++) {
    await page.waitForSelector(CARD, { timeout: cfg.navTimeoutMs }).catch(() => {});
    const raw = await extractVisible(page);
    let added = 0;
    for (const r of raw) {
      const m = normalize(r);
      const key = (m.skoolUsername || m.name).toLowerCase().trim();
      if (!key) continue;
      if (!seen.has(key)) { seen.set(key, m); added++; }
    }
    log(`page ${i + 1}: ${raw.length} cards, +${added} new, ${seen.size} total`);
    // The authoritative "end" signal is the Next button going away (below).
    // A higher stagnant threshold tolerates a transient duplicate read
    // (seen occasionally in headless) without stopping the walk early.
    if (added === 0) { if (++stagnant >= 4) break; } else stagnant = 0;

    const next = page.getByRole("button", { name: selectors.pagination.nextButtonName, exact: true });
    const count = await next.count();
    if (count === 0) break;
    if (await next.first().isDisabled().catch(() => false)) break;

    const prev = await firstHandle(page);
    await humanDelay();
    await next.first().click().catch(() => {});
    // Wait until the first card changes (new page rendered).
    await page.waitForFunction(
      (sel, profileSel, prevHref) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const link = el.querySelector(profileSel);
        const h = link ? link.getAttribute("href") : "";
        return h && h !== prevHref;
      },
      [CARD, selectors.profileLink, prev],
      { timeout: cfg.navTimeoutMs },
    ).catch(() => {});
  }

  return [...seen.values()];
}

// ---- probe ---------------------------------------------------------------
async function probe(page) {
  log("PROBE — inspecting the members page. No data is posted.");
  const count = await page.$$eval(CARD, (e) => e.length).catch(() => 0);
  log(`card selector "${CARD}" -> ${count} elements`);
  if (count === 0) {
    log("No cards matched. Open DevTools, find the repeating member element, update selectors.json -> memberCard.");
    return;
  }
  const raw = await extractVisible(page);
  log("Parsed sample (first 3):");
  raw.slice(0, 3).forEach((r, i) => log(`  ${i}:`, JSON.stringify(normalize(r))));
  const next = await page.getByRole("button", { name: selectors.pagination.nextButtonName, exact: true }).count();
  log(`Next button present: ${next > 0}`);
}

// ---- post ----------------------------------------------------------------
async function post(members, capturedAt) {
  if (!cfg.apiKey) fail("INGEST_API_KEY is not set. Cannot post the roster.");
  const payload = { runId: `roster-${capturedAt}`, capturedAt, fullRoster: cfg.fullRoster, members };
  const res = await fetch(cfg.ingestUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) fail(`ingest-roster returned ${res.status}`, text);
  log("ingest-roster OK:", text);
}

// ---- main ----------------------------------------------------------------
async function main() {
  const { browser, page } = await connect();
  try {
    await ensureLoaded(page);

    if (PROBE) { await probe(page); return; }

    const members = await readAll(page);
    log(`read ${members.length} members`);
    if (members.length === 0) {
      fail("Read zero members. Treating as a broken read, not an empty community. Run --probe.");
    }
    log(`with username: ${members.filter((m) => m.skoolUsername).length}, with join date: ${members.filter((m) => m.joinDate).length}, with last active: ${members.filter((m) => m.lastActive).length}`);

    const capturedAt = new Date().toISOString();
    if (DRY_RUN) {
      log("DRY RUN — nothing posted. First 5 + totals:");
      console.log(JSON.stringify({ count: members.length, sample: members.slice(0, 5) }, null, 2));
      return;
    }
    await post(members, capturedAt);
    log("done.");
  } finally {
    // Do not close the user's Chrome; just release our handle.
    await browser.close().catch(() => {});
  }
}

main().catch((e) => fail("Unhandled error", e.stack || e.message));
