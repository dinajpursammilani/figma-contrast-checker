import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import framer from "vite-plugin-framer"
import basicSsl from "@vitejs/plugin-basic-ssl"

export default defineConfig({
  plugins: [react(), framer(), basicSsl()],
  server: {
    https: true,
    port: 5173,
    strictPort: true,
  },
})
