import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/web-habit-tracker/", // Genau so wie der Name deines Repositories auf GitHub
});
