// Stranica epizode /p/<slug>/v/<id>: naslov + YouTube embed, ništa više.
// Worker se pali SAMO za te putanje (run_worker_first u wrangler.jsonc); sve ostalo je
// statika iz dist/. Podatke čita iz /p/<slug>/v.json koji izgradi Astro.

const ROUTE = /^\/p\/([a-z0-9-]+)\/v\/([A-Za-z0-9_-]{11})\/?$/;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const date = iso => { const [y, m, d] = iso.split("-"); return `${Number(d)}. ${Number(m)}. ${y}.`; };

async function notFound(env, request) {
    const r = await env.ASSETS.fetch(new URL("/404.html", request.url));
    return new Response(r.body, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function page(slug, id, name, [title, iso, min, dom], url) {
    const desc = `${title} — ${name}${min ? `, ${min} min` : ""}.`;
    return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · ${esc(name)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="video.other">
<meta property="og:site_name" content="Hrvatski i regionalni podcasti · domovina.ai">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="https://i.ytimg.com/vi/${id}/hqdefault.jpg">
<meta name="theme-color" content="#f6f3ee" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121418" media="(prefers-color-scheme: dark)">
<style>
:root{--bg:#f6f3ee;--ink:#1b1d22;--muted:#6d717a;--link:#c8102e;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#111317;--ink:#eceae6;--muted:#9a9fa9;--link:#ff4d61}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:960px;margin:0 auto;padding:16px}
a{color:var(--link);text-decoration:none}
a:hover{text-decoration:underline}
h1{font-size:1.25rem;line-height:1.3;margin:12px 0 4px}
.meta{color:var(--muted);margin:0 0 16px;font-size:.9rem}
.video{position:relative;aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden}
.video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.out{margin:12px 0 0;font-size:.9rem;display:flex;gap:16px;flex-wrap:wrap}
</style>
</head>
<body>
<main>
<a href="/p/${slug}/">← ${esc(name)}</a>
<h1>${esc(title)}</h1>
<p class="meta"><time datetime="${iso}">${date(iso)}</time>${min ? ` · ${min} min` : ""}</p>
<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&amp;playsinline=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
<p class="out">${dom ? `<a href="https://domovina.ai/v/${id}">Članak i prijepis na domovina.ai</a>` : ""}<a href="https://www.youtube.com/watch?v=${id}" rel="noopener">YouTube</a></p>
</main>
</body>
</html>`;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const m = url.pathname.match(ROUTE);
        if (!m) return env.ASSETS.fetch(request);
        const [, slug, id] = m;
        const r = await env.ASSETS.fetch(new URL(`/p/${slug}/v.json`, request.url));
        if (!r.ok) return notFound(env, request);
        const { name, eps } = await r.json();
        const ep = eps[id];
        if (!ep) return notFound(env, request);
        const canonical = `https://podcast.domovina.ai/p/${slug}/v/${id}`;
        return new Response(page(slug, id, name, ep, canonical), {
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" },
        });
    },
};
