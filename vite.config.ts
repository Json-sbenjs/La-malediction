import { defineConfig } from "vite";

// L'interface tablette/PC vit dans src/web. Chemins relatifs pour pouvoir
// héberger le build n'importe où (GitHub Pages, sous-dossier…).
export default defineConfig({
  root: "src/web",
  base: "./",
  build: { outDir: "../../dist", emptyOutDir: true },
  server: { host: true },
  preview: { host: true },
});
