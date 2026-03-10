import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // Das hier ist das richtige Paket!
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/web-habit-tracker/',
  plugins: [
    react(), // Hier einfach react() aufrufen
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'HabitTrack Pro',
        short_name: 'HabitTrack',
        description: 'Tracke deine Erfolge und bleib abstinent',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: "any"
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})