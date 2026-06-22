import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const viewerRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: viewerRoot,
  plugins: [react()],
  build: {
    outDir: resolve(viewerRoot, "../../dist/viewer"),
    emptyOutDir: true,
  },
});
