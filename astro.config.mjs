// @ts-check
import { defineConfig } from "astro/config";

// Čisto statički build: Worker servira dist/ kao static assets, bez SSR-a i adaptera.
// Svježina dolazi iz nightly rebuilda (scripts/refresh.sh), ne iz runtimea.
export default defineConfig({
    site: "https://podcast.domovina.ai",
    output: "static",
    trailingSlash: "ignore",
    build: { format: "directory" },
});
