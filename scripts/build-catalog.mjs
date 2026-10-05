#!/usr/bin/env node
/**
 * build-catalog.mjs — slaže src/data/catalog.json iz fetch.domovina.tv repoa.
 *
 * Izvori (svi read-only, ništa se ne piše natrag):
 *   data/podcasts_registry.json            — široki registar (tagovi, status, aktivnost)
 *   automatic/watchlist/watch-state.json   — klasificirani originali kanala u pratnji
 *   cdn.domovina.ai/channels/data/index_bundle.json
 *                                          — OBJAVLJENE epizode kanala na domovina.ai
 *                                            (isti bundle koji čita Flutter app)
 *
 * Jedan mrežni poziv (bundle, ~5 MB), nula LLM-a. Pokreće se prije `astro build`.
 * Ako CDN nije dostupan, praćeni kanali padaju na automatic/podcasts/<slug>-lista.txt.
 *
 *   node scripts/build-catalog.mjs                       # ../fetch.domovina.tv
 *   FETCH_REPO=/put/do/fetch.domovina.tv node scripts/build-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FETCH = path.resolve(process.env.FETCH_REPO || path.join(ROOT, "..", "fetch.domovina.tv"));
const OUT = path.join(ROOT, "src", "data", "catalog.json");

const EPISODES_PER_CHANNEL = 6;
const FEED_SIZE = 120;
const FEED_WINDOW_DAYS = 21;

const readJson = (f, fallback) => {
    try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return fallback; }
};

// ─── Kategorije ──────────────────────────────────────────────────────────────
// Kurator u registryju piše tagove od najvažnijeg, pa PRVI tag odlučuje. Iznimka su
// slabi tagovi (format ili porijeklo, ne tema): „talk-show + culture" je kultura,
// „regional + sport" je sport. Tek kad kanal ima samo slabe tagove, oni odlučuju.
const CATEGORIES = [
    { id: "vjera", name: "Vjera i duhovnost", icon: "✝", tags: ["religious-catholic", "theology", "evangelization", "franciscan", "testimonies", "religious-other", "pro-life", "spirituality", "religion", "religious", "protestant"] },
    { id: "sport", name: "Sport", icon: "⚽", tags: ["sport", "sports", "football", "hnl", "reprezentacija", "mma", "f1", "motorsport", "basketball", "nba", "nfl", "tennis"] },
    { id: "true-crime", name: "True crime i misterij", icon: "🔎", tags: ["true-crime", "mystery"] },
    { id: "povijest", name: "Povijest i Domovinski rat", icon: "🏛", tags: ["history", "domovinski-rat", "domoljubni"] },
    { id: "politika", name: "Politika i društvo", icon: "🗳", tags: ["political", "political-conservative", "political-party", "geopolitics", "society", "advocacy", "debate", "diaspora"] },
    { id: "posao", name: "Posao i novac", icon: "📈", tags: ["business", "entrepreneurship", "finance", "economics", "leadership", "marketing", "realestate", "agriculture"] },
    { id: "tech", name: "Tehnologija i znanost", icon: "🔬", tags: ["technology", "science", "digital", "engineering", "indie-dev", "design"] },
    { id: "zdravlje", name: "Zdravlje i osobni razvoj", icon: "🌱", tags: ["health", "fitness", "personal-development", "communication", "masculinity", "ethics"] },
    { id: "obitelj", name: "Obitelj i lifestyle", icon: "🏡", tags: ["parenting", "women", "lifestyle", "travel", "tourism", "youth"] },
    { id: "logopedija", name: "Logopedija", icon: "🗣", tags: ["speech-therapy"] },
    { id: "obrazovanje", name: "Obrazovanje", icon: "🎓", tags: ["education", "language"] },
    { id: "kultura", name: "Kultura i umjetnost", icon: "🎭", tags: ["culture", "film", "music", "philosophy", "fantasy"] },
    { id: "zabava", name: "Razgovori i zabava", icon: "🎙", tags: ["talk-show", "interview", "comedy", "pop-culture", "gaming", "qa", "behind-the-scenes"] },
    { id: "mediji", name: "Mediji i vijesti", icon: "📰", tags: ["media", "regional-media", "regional", "institutional", "event-archive", "own-channel"] },
];
const FALLBACK_CATEGORY = "zabava";
const WEAK_TAGS = new Set(["talk-show", "interview", "regional", "institutional", "own-channel", "event-archive", "qa", "behind-the-scenes", "english"]);
const TAG_TO_CATEGORY = new Map(CATEGORIES.flatMap(c => c.tags.map(t => [t, c.id])));

// Statusi koji NISU hrvatski podcast (ili link ne vodi nikamo) — izvan kataloga.
const EXCLUDED_STATUS = new Set(["not-podcast", "dead-url", "rejected", "disputed"]);
const FINISHED_STATUS = new Set(["completed", "concluded", "archive"]);

function pickCategory(tags) {
    const strong = tags.find(t => !WEAK_TAGS.has(t) && TAG_TO_CATEGORY.has(t));
    const any = strong || tags.find(t => TAG_TO_CATEGORY.has(t));
    return any ? TAG_TO_CATEGORY.get(any) : FALLBACK_CATEGORY;
}

// ─── Datumi ──────────────────────────────────────────────────────────────────
// Ulaz dolazi u tri oblika: "20261002", "2026-10-02", "NA". Izlaz je uvijek ISO.
function isoDate(v) {
    if (!v || typeof v !== "string") return null;
    const m = v.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
const maxDate = (...ds) => ds.filter(Boolean).sort().at(-1) || null;
const today = new Date().toISOString().slice(0, 10);
const daysSince = d => d ? Math.round((Date.parse(today) - Date.parse(d)) / 86400000) : null;

// ─── Epizode ─────────────────────────────────────────────────────────────────
// Zadnji _yt_/watch?v=/youtu.be ID u URL-u (11 znakova).
function videoIdFromUrl(url) {
    const m = String(url).match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
}

// Bundle je ključan po storage ID-u kanala (`40_dana_za_zivot`), registry po slugu
// (`40-dana-za-zivot`) — preslikavanje je 1:1 zamjena `_` → `-`.
const BUNDLE_URL = process.env.BUNDLE_URL || "https://cdn.domovina.ai/channels/data/index_bundle.json";
async function loadBundle() {
    try {
        const res = await fetch(BUNDLE_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const b = await res.json();
        return new Map(b.channels.map(c => [c.id.replace(/_/g, "-"), c]));
    } catch (e) {
        console.warn(`⚠️  Bundle s CDN-a nedostupan (${e.message}) — praćeni kanali bez epizoda s datumom.`);
        return new Map();
    }
}

const clip = (s, n) => !s ? "" : s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…";

// Liste praćenih kanala: `DATE|TITLE|URL`, ponekad s razmacima oko `|`.
function readTrackedEpisodes(slug) {
    const f = path.join(FETCH, "automatic", "podcasts", `${slug}-lista.txt`);
    if (!fs.existsSync(f)) return null;
    const eps = [];
    for (const raw of fs.readFileSync(f, "utf8").split("\n")) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const parts = line.split("|").map(s => s.trim());
        if (parts.length < 3) continue;
        const id = videoIdFromUrl(parts.at(-1));
        if (!id) continue;
        eps.push({ id, date: isoDate(parts[0]), title: parts.slice(1, -1).join(" | ") });
    }
    return eps;
}

function readChannelAvatar(slug) {
    const c = readJson(path.join(FETCH, "automatic", "podcasts", `${slug}-channel.json`), null);
    if (!c) return { avatar: null, followers: null };
    const thumbs = c.thumbnails || [];
    const t = thumbs.find(x => x.id === "avatar_uncropped")
        || thumbs.filter(x => x.width && x.width === x.height).sort((a, b) => b.width - a.width)[0];
    // yt3 URL-ovi primaju veličinu u sufiksu; 176 px je dovoljno za 2× retina avatar od 88 px.
    const avatar = t?.url?.includes("googleusercontent.com")
        ? t.url.replace(/=s\d+.*$/, "=s176-c-k-c0x00ffffff-no-rj")
        : t?.url || null;
    return { avatar, followers: c.channel_follower_count ?? null };
}

// ─── Glavni dio ──────────────────────────────────────────────────────────────
const registry = readJson(path.join(FETCH, "data", "podcasts_registry.json"), null);
if (!registry) {
    console.error(`❌ Nema registryja u ${FETCH}/data/podcasts_registry.json (postavi FETCH_REPO).`);
    process.exit(1);
}
const bundle = await loadBundle();
const watch = readJson(path.join(FETCH, "automatic", "watchlist", "watch-state.json"), { channels: {} }).channels || {};

// Avatari s CDN-a postoje za kandidate glasanja (sync_voting_candidates.mjs) — to su
// nepraćeni kanali s YouTube URL-om. Praćenima avatar čitamo iz channel.json.
const CDN_AVATAR = slug => `https://cdn.domovina.ai/registry/avatars/${slug}.jpg`;

const podcasts = [];
const feed = [];
const stats = { excluded: 0 };

for (const p of registry.podcasts) {
    const status = p.metadata?.status || "unknown";
    if (EXCLUDED_STATUS.has(status) || p.tracking?.permanently_excluded) { stats.excluded++; continue; }

    const tags = p.tags || [];
    const onDomovina = !!p.tracking?.enabled;
    const ytUrl = p.youtube?.url || null;

    let episodes = [];
    let avatar = null;
    let followers = p.metadata?.subscribers ?? null;
    let episodeCount = null;
    let description = "";

    if (onDomovina) {
        const b = bundle.get(p.slug);
        if (b) {
            episodes = (b.videos || [])
                .map(v => ({
                    id: v.id,
                    date: isoDate(v.date),
                    title: v.title_hr || v.title,
                    min: v.duration_seconds ? Math.round(v.duration_seconds / 60) : null,
                    abstract: clip(v.abstract, 240),
                }))
                .filter(e => e.date)
                .sort((a, b) => b.date.localeCompare(a.date));
            episodeCount = b.video_count ?? episodes.length;
            // yt3 avatar iz channel.json traži se u 176 px; CDN avatar_square je original (do 1600 px).
            avatar = readChannelAvatar(p.slug).avatar || b.avatar_square || null;
            followers = b.follower_count ?? followers;
            description = clip(b.description, 420);
        } else {
            const eps = readTrackedEpisodes(p.slug) || [];
            episodeCount = eps.length || null;
            episodes = eps.filter(e => e.date).sort((a, b) => b.date.localeCompare(a.date));
            avatar = readChannelAvatar(p.slug).avatar;
        }
    } else {
        const seen = watch[p.slug]?.seen || {};
        episodes = Object.entries(seen)
            .filter(([, v]) => v.cls === "original")
            .map(([id, v]) => ({
                id,
                date: isoDate(v.upload_date),
                title: v.title,
                min: v.duration ? Math.round(v.duration / 60) : null,
                isNew: !v.baseline,
            }))
            .filter(e => e.date)
            .sort((a, b) => b.date.localeCompare(a.date));
        if (ytUrl && p.youtube?.type !== "playlist" && !p.youtube?.playlist_id) avatar = CDN_AVATAR(p.slug);
    }

    const last = maxDate(
        episodes[0]?.date,
        isoDate(p.activity?.last_original_upload),
        isoDate(p.quality_score?.last_episode_date),
        isoDate(p.metadata?.last_episode_date),
    );
    const age = daysSince(last);
    const activity = FINISHED_STATUS.has(status) ? "finished"
        : age == null ? "unknown"
        : age <= 30 ? "active"
        : age <= 120 ? "slowing"
        : "dormant";

    const entry = {
        slug: p.slug,
        name: p.display_name,
        category: pickCategory(tags),
        tags,
        hosts: (p.voditelji || []).filter(Boolean),
        description,
        youtube: ytUrl,
        audioOnly: !ytUrl,
        onDomovina,
        domovinaUrl: onDomovina ? `https://www.domovina.ai/c/${p.slug}` : null,
        avatar,
        followers,
        last,
        activity,
        originals90d: p.activity?.originals_90d ?? null,
        avgMin: p.metadata?.average_duration_minutes ?? null,
        episodeCount,
        score: p.quality_score?.total ?? null,
        episodes: episodes.slice(0, EPISODES_PER_CHANNEL).map(({ isNew, ...e }) => e),
    };
    podcasts.push(entry);

    for (const e of episodes) {
        const age = daysSince(e.date);
        if (age == null || age > FEED_WINDOW_DAYS || age < 0) break;
        const { abstract, ...rest } = e;
        feed.push({ ...rest, slug: p.slug, name: p.display_name, onDomovina, category: entry.category });
    }
}

feed.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name, "hr"));
// Isti video zna stajati na dva kanala (roditelj + podkanal): u feedu samo jednom.
const seenIds = new Set();
const feedAll = feed.filter(e => !seenIds.has(e.id) && seenIds.add(e.id));
const feedOut = feedAll.slice(0, FEED_SIZE).map(({ isNew, ...e }) => e);

const counts = Object.fromEntries(CATEGORIES.map(c => [c.id, podcasts.filter(p => p.category === c.id).length]));
const catalog = {
    generated_at: new Date().toISOString(),
    registry_version: registry.version,
    tagLabels: registry.tag_legend || {},
    categories: CATEGORIES.map(({ tags, ...c }) => ({ ...c, count: counts[c.id] })),
    totals: {
        podcasts: podcasts.length,
        onDomovina: podcasts.filter(p => p.onDomovina).length,
        active: podcasts.filter(p => p.activity === "active").length,
        newThisWeek: feedAll.filter(e => daysSince(e.date) <= 7).length,
    },
    feed: feedOut,
    podcasts: podcasts.sort((a, b) => a.name.localeCompare(b.name, "hr")),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(catalog));
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`✅ ${OUT} — ${podcasts.length} podcasta (${stats.excluded} izvan kataloga), feed ${feedOut.length}, ${kb} KB`);
console.log("   " + catalog.categories.map(c => `${c.id}:${c.count}`).join(" "));
console.log("   aktivnost: " + ["active", "slowing", "dormant", "finished", "unknown"].map(a => `${a}:${podcasts.filter(p => p.activity === a).length}`).join(" "));
