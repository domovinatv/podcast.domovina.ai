// Interakcija početne stranice. Sav sadržaj je već u HTML-u (statički build), pa ovdje
// samo skrivamo/otkrivamo i preslažemo — bez ikakvog dohvaćanja podataka, osim
// detalja kanala koji se čita s njegove trajne stranice /p/<slug>/.
import { applyRelative } from "./rel-time.js";
import { stopInline } from "./player.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase().trim();

const params = new URLSearchParams(location.search);
const state = {
    q: params.get("q") || "",
    filter: params.get("f") || "all",
    cat: params.get("k") || "",
    sort: params.get("s") || "fresh",
};

const input = $("#q");
const panelsEl = $(".panels");
const panels = $$(".panel");
const feedItems = $$(".feed .ep");
const days = $$(".feed .day");

// ─── Filtriranje ────────────────────────────────────────────────────────────
function rowMatches(row, terms) {
    if (state.filter === "active" && row.dataset.act !== "active") return false;
    if (state.filter === "domovina" && !row.dataset.dom) return false;
    return terms.every(t => row.dataset.q.includes(t));
}

function apply() {
    const terms = fold(state.q).split(/\s+/).filter(Boolean);
    const searching = terms.length > 0 || state.filter !== "all";
    let shown = 0;

    for (const panel of panels) {
        const catOk = !state.cat || panel.dataset.cat === state.cat;
        let n = 0;
        for (const row of $$(".row", panel)) {
            const ok = catOk && rowMatches(row, terms);
            row.hidden = !ok;
            if (ok) n++;
        }
        // Uspavane otvaramo sami samo dok pretraga traje — i zatvaramo samo one koje smo mi otvorili.
        const dormant = $(".dormant", panel);
        if (dormant) {
            const hits = $$(".row:not([hidden])", dormant).length;
            dormant.hidden = hits === 0;
            if (searching && hits) { if (!dormant.open) { dormant.open = true; dormant.dataset.auto = "1"; } }
            else if (dormant.dataset.auto) { dormant.open = false; delete dormant.dataset.auto; }
        }
        panel.hidden = n === 0;
        shown += n;
    }
    panelsEl.classList.toggle("solo", !!state.cat);
    $(".empty").hidden = shown > 0;

    // Feed prati isti odabir: kategorija, „na domovina.ai", pretraga po naslovu i kanalu.
    const visibleSlugs = new Set($$(".row:not([hidden])").map(r => r.dataset.slug));
    for (const ep of feedItems) {
        let ok = (!state.cat || ep.dataset.cat === state.cat) && (state.filter !== "domovina" || ep.dataset.dom);
        if (ok && terms.length) ok = visibleSlugs.has(ep.dataset.slug) || terms.every(t => fold(ep.textContent).includes(t));
        ep.hidden = !ok;
    }
    let anyDay = false;
    for (const d of days) { d.hidden = !$(".ep:not([hidden])", d); anyDay ||= !d.hidden; }
    $(".feed-empty").hidden = anyDay;

    for (const b of $$(".seg button")) b.setAttribute("aria-pressed", String(b.dataset.filter === state.filter));
    for (const b of $$(".cat")) b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat));
    syncUrl();
}

function sortRows() {
    panelsEl.dataset.sort = state.sort;
    const cmp = {
        fresh: (a, b) => (b.dataset.last || "").localeCompare(a.dataset.last || ""),
        name: (a, b) => a.querySelector(".row-name").textContent.localeCompare(b.querySelector(".row-name").textContent, "hr"),
        followers: (a, b) => Number(b.dataset.f) - Number(a.dataset.f),
    }[state.sort] || (() => 0);
    for (const ul of $$(".catalog .rows")) ul.append(...$$(":scope > .row", ul).sort(cmp));
}

function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.filter !== "all") p.set("f", state.filter);
    if (state.cat) p.set("k", state.cat);
    if (state.sort !== "fresh") p.set("s", state.sort);
    const qs = p.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
}

// ─── Kontrole ───────────────────────────────────────────────────────────────
let typing;
input.value = state.q;
input.addEventListener("input", () => {
    clearTimeout(typing);
    typing = setTimeout(() => { state.q = input.value; apply(); }, 80);
});
input.addEventListener("keydown", e => {
    if (e.key === "Escape") { input.value = ""; state.q = ""; apply(); input.blur(); }
});
document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== input && !e.metaKey && !e.ctrlKey && !$("#detail").open) {
        e.preventDefault();
        input.focus();
    }
});

for (const b of $$(".seg button")) b.addEventListener("click", () => { state.filter = b.dataset.filter; apply(); });

for (const b of $$(".cat")) b.addEventListener("click", () => {
    state.cat = state.cat === b.dataset.cat ? "" : b.dataset.cat;
    apply();
    $(".catalog").scrollTo({ top: 0 });
    if (matchMedia("(max-width: 899px)").matches) window.scrollTo({ top: 0 });
    b.scrollIntoView({ block: "nearest", inline: "nearest" });
});

const sortSel = $("#sort");
sortSel.value = state.sort;
sortSel.addEventListener("change", () => { state.sort = sortSel.value; sortRows(); syncUrl(); });

$("#reset").addEventListener("click", () => {
    Object.assign(state, { q: "", filter: "all", cat: "" });
    input.value = "";
    apply();
});

// Mobilni tabovi: katalog ili feed (na desktopu se vide oba, tabovi su skriveni).
for (const t of $$(".mtabs [role=tab]")) t.addEventListener("click", () => {
    document.body.dataset.view = t.dataset.view;
    for (const x of $$(".mtabs [role=tab]")) x.setAttribute("aria-selected", String(x === t));
    window.scrollTo({ top: 0 });
});

$("#theme").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});

// ─── Detalj kanala u dijalogu ───────────────────────────────────────────────
const dlg = $("#detail");
const dlgBody = $(".dlg-body", dlg);
const cache = new Map();

function load(href) {
    if (!cache.has(href)) {
        cache.set(href, fetch(href)
            .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
            .then(html => new DOMParser().parseFromString(html, "text/html").querySelector("#detail-root"))
            .catch(err => { cache.delete(href); throw err; }));
    }
    return cache.get(href);
}

async function openDetail(href) {
    dlgBody.innerHTML = '<p class="dlg-loading">Učitavam…</p>';
    if (!dlg.open) dlg.showModal();
    try {
        const node = await load(href);
        dlgBody.replaceChildren(document.importNode(node, true));
        applyRelative(dlgBody);
        dlgBody.scrollTop = 0;
    } catch {
        location.href = href;
    }
}

document.addEventListener("click", e => {
    const a = e.target.closest(".row-link");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    openDetail(a.getAttribute("href"));
});
// Hover/fokus unaprijed dohvati detalj — dijalog se onda otvori bez čekanja.
document.addEventListener("pointerover", e => {
    const a = e.target.closest?.(".row-link");
    if (a) load(a.getAttribute("href")).catch(() => {});
});
dlg.addEventListener("click", e => {
    if (e.target === dlg || e.target.closest("[data-close]")) { stopInline(dlg); dlg.close(); }
});
dlg.addEventListener("close", () => stopInline(dlg));

// ─── Start ──────────────────────────────────────────────────────────────────
if (state.sort !== "fresh") sortRows();
apply();
if (state.cat) $(`.cat[data-cat="${state.cat}"]`)?.scrollIntoView({ block: "nearest", inline: "center" });
