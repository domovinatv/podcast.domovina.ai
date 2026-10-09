// Podaci za kalendarski birač (DayPicker): jedna zajednička datoteka umjesto kalendara
// ugrađenog u svaku dnevnu stranicu — inače bi nightly mijenjao (i uploadao) sve stranice.
import { archiveDays } from "../../lib/catalog.js";

export function GET() {
    const days = archiveDays.slice().reverse().map(d => [d.date, d.count]);
    return new Response(JSON.stringify({
        first: days[0]?.[0] || null,
        last: days.at(-1)?.[0] || null,
        max: Math.max(1, ...days.map(d => d[1])),
        days,
    }), { headers: { "Content-Type": "application/json" } });
}
