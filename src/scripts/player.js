// Epizode koje nisu na domovina.ai sviraju na stranici (YouTube embed) umjesto da
// vode van. Poveznica ostaje prava (href na YouTube), pa bez JS-a, uz ⌘/Ctrl-klik
// ili srednju tipku i dalje otvara YouTube u novoj kartici.
//   .dep[data-yt]     — epizoda u detalju kanala: svira na mjestu, kartica se raširi
//   .ep-link[data-yt] — epizoda u feedu: sličica je premala, svira u dijalogu #player

const embedSrc = id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;

function iframe(id, title) {
    const f = document.createElement("iframe");
    f.src = embedSrc(id);
    f.title = title || "YouTube video";
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    return f;
}

// Samo jedan player odjednom: novi gasi stari (i vraća mu sličicu).
export function stopInline(root = document) {
    for (const a of root.querySelectorAll(".dep.playing")) {
        a.classList.remove("playing");
        a.querySelector(".ep-thumb iframe")?.remove();
        a.querySelector(".ep-thumb img")?.removeAttribute("hidden");
    }
}

function playInline(a) {
    if (a.classList.contains("playing")) return;
    stopInline();
    const thumb = a.querySelector(".ep-thumb");
    thumb.querySelector("img")?.setAttribute("hidden", "");
    thumb.append(iframe(a.dataset.yt, a.dataset.title));
    a.classList.add("playing");
    a.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

let dlg;
function playerDialog() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.id = "player";
    dlg.setAttribute("aria-label", "Epizoda");
    dlg.innerHTML = `
        <button type="button" class="dlg-close icon-btn" aria-label="Zatvori" data-close>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
        <p class="player-title"></p>
        <span class="ep-thumb"></span>
        <p class="player-out"><a target="_blank" rel="noopener">Otvori na YouTubeu</a></p>`;
    // Zatvoren dijalog mora utihnuti — iframe ne smije svirati u skrivenom elementu.
    // Gasimo odmah na klik, a „close" pokriva Esc.
    const silence = () => dlg.querySelector(".ep-thumb").replaceChildren();
    dlg.addEventListener("click", e => {
        if (e.target === dlg || e.target.closest("[data-close]")) { silence(); dlg.close(); }
    });
    dlg.addEventListener("cancel", silence);
    dlg.addEventListener("close", silence);
    document.body.append(dlg);
    return dlg;
}

function playInDialog(a) {
    stopInline();
    const d = playerDialog();
    d.querySelector(".player-title").textContent = a.dataset.title || "";
    d.querySelector(".player-out a").href = a.href;
    d.querySelector(".ep-thumb").replaceChildren(iframe(a.dataset.yt, a.dataset.title));
    if (!d.open) d.showModal();
}

document.addEventListener("click", e => {
    const a = e.target.closest?.("a[data-yt]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (a.classList.contains("dep")) playInline(a);
    else playInDialog(a);
});
