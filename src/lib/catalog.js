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

export const ACTIVITY_LABEL = {
    active: "aktivan",
    slowing: "usporava",
    dormant: "uspavan",
    finished: "završen",
    unknown: "nepoznato",
};

// Redoslijed unutar kategorije: najsvježiji prvi, a bez datuma na kraj.
export const byFreshness = (a, b) => (b.last || "").localeCompare(a.last || "") || a.name.localeCompare(b.name, "hr");
