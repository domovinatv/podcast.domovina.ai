// Relativni datumi po satu POSJETITELJA, ne po trenutku builda: stranica se
// gradi jednom na noć, a „prije 2 dana" mora biti istina i navečer.

const DAY = 86400000;
const startOfDay = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
const WEEKDAYS = ["nedjelja", "ponedjeljak", "utorak", "srijeda", "četvrtak", "petak", "subota"];

export function daysAgo(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return Math.round((startOfDay(Date.now()) - new Date(y, m - 1, d).getTime()) / DAY);
}

export function relative(iso) {
    const n = daysAgo(iso);
    if (n <= 0) return "danas";
    if (n === 1) return "jučer";
    if (n < 14) return `${n} d`;
    if (n < 60) return `${Math.round(n / 7)} tj`;
    if (n < 365) return `${Math.round(n / 30)} mj`;
    const y = Math.round(n / 365);
    return `${y} god`;
}

export function dayLabel(iso) {
    const n = daysAgo(iso);
    if (n <= 0) return "Danas";
    if (n === 1) return "Jučer";
    const [y, m, d] = iso.split("-").map(Number);
    const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
    return n < 7 ? `${wd[0].toUpperCase()}${wd.slice(1)}, ${d}. ${m}.` : `${d}. ${m}. ${y}.`;
}

export function applyRelative(root = document) {
    for (const t of root.querySelectorAll("time[data-rel]")) {
        const iso = t.getAttribute("datetime");
        if (!iso) continue;
        if (!t.title) t.title = t.textContent;
        t.textContent = relative(iso);
    }
    for (const t of root.querySelectorAll("time[data-day]")) t.textContent = dayLabel(t.getAttribute("datetime"));
}

applyRelative();
