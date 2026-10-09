// Jedini ulaz u podatke za stranice. catalog.json slaže scripts/build-catalog.mjs.
import catalog from "../data/catalog.json";

export default catalog;

export const BUILD_DATE = catalog.generated_at.slice(0, 10);

export const categoryById = Object.fromEntries(catalog.categories.map(c => [c.id, c]));

// Na domovina.ai epizoda vodi na našu stranicu (članak, poglavlja, prijepis);
// ostalo na YouTube, jer drugdje ne postoji.
export function episodeUrl(ep, onDomovina) {
    return onDomovina ? `https://domovina.ai/v/${ep.id}` : `https://www.youtube.com/watch?v=${ep.id}`;
}

// Isti YouTube video kroz domovina.ai player (/yt/<id>) — za kanale koji tamo nisu
// obrađeni. Eksperiment uz embed na ovoj stranici, ne zamjena.
export const domovinaPlayerUrl = id => `https://domovina.ai/yt/${id}`;

export const thumbUrl = id => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export function initials(name) {
    const words = name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
    return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2)).toUpperCase();
}

// Stabilna boja monograma po slugu, da isti kanal uvijek izgleda isto.
export function hue(slug) {
    let h = 0;
    for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
}

const MONTHS = ["sij", "velj", "ožu", "tra", "svi", "lip", "srp", "kol", "ruj", "lis", "stu", "pro"];
export function shortDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${d}. ${MONTHS[m - 1]}${y !== Number(BUILD_DATE.slice(0, 4)) ? ` ${y}.` : ""}`;
}

export function compactNumber(n) {
    if (n == null) return null;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " mil.";
    if (n >= 1e3) return Math.round(n / 1e3) + " tis.";
    return String(n);
}

// „57 ep." ili „60+ ep." kad znamo samo donju granicu (vidi episodeCountMin u build-catalog.mjs).
export function episodeCountLabel(p, unit = "ep.") {
    return p.episodeCount ? `${p.episodeCount}${p.episodeCountMin ? "+" : ""} ${unit}` : null;
}

export const ACTIVITY_LABEL = {
    active: "aktivan",
    slowing: "usporava",
    dormant: "uspavan",
    finished: "završen",
    unknown: "nepoznato",
};

// Redoslijed unutar kategorije: najsvježiji prvi, a bez datuma na kraj.
export const byFreshness = (a, b) => (b.last || "").localeCompare(a.last || "") || a.name.localeCompare(b.name, "hr");

// Arhiva po danima (/dani/) — slaže je build-catalog.mjs u days.json, najnoviji dan prvi.
import daysData from "../data/days.json";
export const archiveDays = daysData.days;
export const ARCHIVE_SINCE = daysData.since;

const WEEKDAYS_LONG = ["nedjelja", "ponedjeljak", "utorak", "srijeda", "četvrtak", "petak", "subota"];
const MONTHS_GEN = ["siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja", "srpnja", "kolovoza", "rujna", "listopada", "studenoga", "prosinca"];
// „Četvrtak, 8. listopada 2026." — puni datum za naslove dnevnih stranica.
export function longDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const wd = WEEKDAYS_LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return `${wd[0].toUpperCase()}${wd.slice(1)}, ${d}. ${MONTHS_GEN[m - 1]} ${y}.`;
}

// „21 h" / „45 min" — ukupno audia u danu.
export const hoursLabel = min => min >= 90 ? `${Math.round(min / 60)} h` : `${min} min`;

// Hrvatska množina: 1 epizoda, 2–4 epizode, 5+ epizoda (11–14 uvijek „epizoda").
export function plural(n, one, few, many) {
    const t = n % 10, h = n % 100;
    if (t === 1 && h !== 11) return one;
    if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return few;
    return many;
}
