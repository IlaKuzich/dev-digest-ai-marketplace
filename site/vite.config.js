import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" — assets resolve relatively so the build works whether it's
// served from a domain root or a GitHub Pages project subpath (/reponame/).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
