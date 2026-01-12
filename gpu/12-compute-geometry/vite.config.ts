import { defineConfig } from "vite";

export default defineConfig({
  // publicDir: "../../public",
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
