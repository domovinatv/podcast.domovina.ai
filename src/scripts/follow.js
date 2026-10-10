// „Moji podcasti": popis kanala koje posjetitelj prati, samo u njegovom pregledniku
// (localStorage). Nema računa ni servera — to je udobnost, ne podatak koji mora preživjeti
// brisanje preglednika. Svaki element s data-slug koji je praćen dobiva data-mine="1",
// pa CSS i filteri rade nad istim atributom na početnoj, /dani/ i /p/ stranicama.

const KEY = "following";
const listeners = new Set();

function read() {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { return new Set(); }
}
let mine = read();

export const following = () => mine;
export const isMine = slug => mine.has(slug);
export const onFollowChange = fn => listeners.add(fn);

export function toggle(slug) {
    mine.has(slug) ? mine.delete(slug) : mine.add(slug);
    try { localStorage.setItem(KEY, JSON.stringify([...mine])); } catch {}
    paint();
    for (const fn of listeners) fn(mine);
}

export function paint(root = document) {
    for (const el of root.querySelectorAll(".row[data-slug], .ep[data-slug]")) {
        if (mine.has(el.dataset.slug)) el.dataset.mine = "1"; else delete el.dataset.mine;
    }
    for (const b of root.querySelectorAll("[data-follow]")) {
        const on = mine.has(b.dataset.follow);
        b.setAttribute("aria-pressed", String(on));
        b.querySelector(".follow-label").textContent = on ? "Pratiš" : "Prati";
    }
}

document.addEventListener("click", e => {
    const b = e.target.closest("[data-follow]");
    if (b) toggle(b.dataset.follow);
});

// Druga kartica je promijenila popis → uskladi ovu.
window.addEventListener("storage", e => {
    if (e.key !== KEY) return;
    mine = read();
    paint();
    for (const fn of listeners) fn(mine);
});

paint();
