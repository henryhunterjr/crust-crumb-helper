#!/usr/bin/env node
// Crust & Crumb roster agent (P0).
//
// Reads the Skool member directory from Henry's OWN logged-in Chrome and posts
// it to the Helper's ingest-roster endpoint. It behaves like Henry working by
// hand: it rides his existing browser session, moves at a human pace, and
// stops loudly the moment the page looks wrong instead of guessing or
// hammering. It never stores a password and never posts an empty read.
//
// Connect mode: Chrome must be started with remote debugging on, using the
// normal profile so the Skool session is already signed in. See README.md.
//
// Usage:
//   node read-roster.mjs --probe     # inspect the page, confirm selectors, no post
//   node read-roster.mjs --dry-run   # full read + build payload, print it, no post
//   node read-roster.mjs             # full read + post to ingest-roster
//
// Config comes from environment variables (see .env.example). On Windows the
// scheduled task sets them; locally you can `node --env-file=.env read-roster.mjs`.

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = new Set(process.argv.slice(2));
const PROBE = args.has("--probe");
const DRY_RUN = args.has("--dry-run");

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

const selectors = JSON.parse(
  readFileSync(join(__dirname, "selectors.json"), "utf8"),
);

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

async function connect() {
  let browser;
  try {
    browser = await chromium.connectOverCDP(cfg.cdp);
  } catch (e) {
    fail(
      `Could not connect to Chrome at ${cfg.cdp}. Start Chrome with remote debugging and your normal profile first (see README.md).`,
      e.message,
    );
  }
  const contexts = browser.contexts();
  if (!contexts.length) fail("Chrome has no open browser context.");
  const context = contexts[0];
  const page = await context.newPage();
  page.setDefaultTimeout(cfg.navTimeoutMs);
  return { browser, page };
}

async function ensureLoggedIn(page) {
  await page.goto(cfg.communityUrl, { waitUntil: "domcontentloaded" });
  await humanDelay();
  const loggedOut = await page.$(selectors.loggedOutMarker);
  const hasCards = await page.$(selectors.memberCard);
  if (loggedOut && !hasCards) {
    fail(
      "Looks signed out, or the members page did not load member cards. Sign in to Skool in this Chrome profile, then re-run.",
    );
  }
}

async function probe(page) {
  log("PROBE — inspecting the members page. No data is posted.");
  const cardCount = await page.$$eval(
    selectors.memberCard,
    (els) => els.length,
  ).catch(() => 0);
  log(`memberCard selector "${selectors.memberCard}" -> ${cardCount} elements`);

  if (cardCount === 0) {
    log(
      "No member cards matched. Open DevTools on the members page, find the repeating element for one member, and update selectors.json -> memberCard.",
    );
  } else {
    const sample = await page.$$eval(
      selectors.memberCard,
      (els) => els.slice(0, 2).map((el) => el.outerHTML.slice(0, 600)),
    );
    log("Sample card HTML (first 2, truncated):");
    sample.forEach((html, i) => log(`--- card ${i} ---\n${html}`));
  }
  log(
    "Use the sample above to confirm card.name / profileLink / joinDate / lastActive / posts / comments in selectors.json.",
  );
}

async function extractVisible(page) {
  return page.$$eval(
    selectors.memberCard,
    (cards, sel) => {
      const txt = (el, q) => {
        const n = q ? el.querySelector(q) : el;
        return n ? (n.textContent || "").trim() : "";
      };
      const attr = (el, q, a) => {
        const n = el.querySelector(q);
        return n ? n.getAttribute(a) : null;
      };
      return cards.map((el) => {
        const profileHref = attr(el, sel.card.profileLink, "href");
        let username = null;
        if (profileHref) {
          const m = profileHref.match(/skool\.com\/@?([^/?#]+)/i);
          if (m) username = m[1];
        }
        return {
          name: txt(el, sel.card.name),
          skoolUsername: username,
          profileUrl: profileHref,
          joinDateText: txt(el, sel.card.joinDate),
          lastActiveText: txt(el, sel.card.lastActive),
          postsText: txt(el, sel.card.posts),
          commentsText: txt(el, sel.card.comments),
        };
      });
    },
    selectors,
  );
}

// Skool shows relative times ("3d ago", "2 months ago", "Joined Jan 12").
// Normalize to YYYY-MM-DD where we can; leave null when we cannot read it,
// so the partial update on the server never overwrites a known value.
function toIsoDate(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  const now = new Date();
  let m;
  if ((m = t.match(/(\d+)\s*(d|day|days)\s*ago/))) {
    now.setDate(now.getDate() - Number(m[1]));
    return now.toISOString().split("T")[0];
  }
  if ((m = t.match(/(\d+)\s*(w|week|weeks)\s*ago/))) {
    now.setDate(now.getDate() - Number(m[1]) * 7);
    return now.toISOString().split("T")[0];
  }
  if ((m = t.match(/(\d+)\s*(mo|month|months)\s*ago/))) {
    now.setMonth(now.getMonth() - Number(m[1]));
    return now.toISOString().split("T")[0];
  }
  if (/(hour|minute|min|just now|today)/.test(t)) {
    return now.toISOString().split("T")[0];
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
}

function toCount(text) {
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

function normalizeMember(raw) {
  return {
    name: raw.name || "",
    skoolUsername: raw.skoolUsername || null,
    profileUrl: raw.profileUrl || null,
    joinDate: toIsoDate(raw.joinDateText),
    lastActive: toIsoDate(raw.lastActiveText),
    posts: toCount(raw.postsText),
    comments: toCount(raw.commentsText),
  };
}

async function readAll(page) {
  const seen = new Map(); // key -> normalized member
  const mode = selectors.pagination?.mode || "scroll";
  let stagnantRounds = 0;

  for (let i = 0; i < cfg.maxPages; i++) {
    const raw = await extractVisible(page);
    let added = 0;
    for (const r of raw) {
      const m = normalizeMember(r);
      if (!m.name) continue;
      const key = (m.skoolUsername || m.name).toLowerCase().trim();
      if (!seen.has(key)) {
        seen.set(key, m);
        added++;
      }
    }
    log(`round ${i + 1}: ${raw.length} visible, +${added} new, ${seen.size} total`);

    if (added === 0) {
      stagnantRounds++;
      if (stagnantRounds >= 2) break; // reached the end
    } else {
      stagnantRounds = 0;
    }

    await humanDelay();

    if (mode === "scroll") {
      await page.evaluate((sel) => {
        const c = sel.pagination?.scrollContainer
          ? document.querySelector(sel.pagination.scrollContainer)
          : null;
        (c || window).scrollBy(0, (c || document.documentElement).clientHeight * 0.9);
      }, selectors);
    } else {
      const next = await page.$(
        selectors.pagination.loadMoreButton || selectors.pagination.nextButton,
      );
      if (!next) break;
      await next.click().catch(() => {});
    }
  }

  return [...seen.values()];
}

async function post(members, capturedAt) {
  if (!cfg.apiKey) fail("INGEST_API_KEY is not set. Cannot post the roster.");
  const payload = {
    runId: `roster-${capturedAt}`,
    capturedAt,
    fullRoster: cfg.fullRoster,
    members,
  };
  const res = await fetch(cfg.ingestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) fail(`ingest-roster returned ${res.status}`, text);
  log("ingest-roster OK:", text);
}

async function main() {
  const { browser, page } = await connect();
  try {
    await ensureLoggedIn(page);

    if (PROBE) {
      await probe(page);
      return;
    }

    const members = await readAll(page);
    log(`read ${members.length} members`);

    if (members.length === 0) {
      fail(
        "Read zero members. Treating as a broken read, not an empty community. Run --probe to fix selectors.json.",
      );
    }

    const withName = members.filter((m) => m.name).length;
    log(`names: ${withName}, usernames: ${members.filter((m) => m.skoolUsername).length}`);

    const capturedAt = new Date().toISOString();
    if (DRY_RUN) {
      log("DRY RUN — payload below, nothing posted:");
      console.log(JSON.stringify({ capturedAt, fullRoster: cfg.fullRoster, members }, null, 2));
      return;
    }

    await post(members, capturedAt);
    log("done.");
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((e) => fail("Unhandled error", e.stack || e.message));
