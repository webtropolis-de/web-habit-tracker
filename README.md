# ⚔️ HabitTrack Pro: RPG Edition

**HabitTrack Pro** ist ein gamifizierter, cloud-basierter Habit-Tracker im epischen Retro-RPG-Design. Er wurde speziell für die Unterstützung bei Abstinenz (Streaks) und persönlicher Weiterentwicklung (Wochenziele) entwickelt. Verwandle deinen Alltag in eine Quest: Sammle Erfahrung, steige im Level auf und lass dich von deinem KI-Mentor auf dem Pfad der Disziplin begleiten.

![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

## ✨ Features

- **🎮 RPG-Gamification & Level-System:** Erhalte Erfahrungspunkte (XP) für das Einhalten deiner Gewohnheiten. Erreiche Meilensteine, breche Rekorde und steige im Rang auf (vom Novizen zur Legende).
- **🛡️ Freischaltbare Gestalten:** Deine Erfolge schalten neue Pixel-Art Avatare frei. Beginne als Ritter und schalte mit steigendem Level Waldläufer, Werwölfe oder untote Krieger frei.
- **🧙‍♂️ KI-Mentor (Gemini AI):** Ein dunkler Magier als Coach analysiert deine Habit-Streaks, gibt dir rollenspiel-basierte Motivation und liefert psychologisch fundierte Tipps für schwierige Quests.
- **⏳ Zwei Quest-Typen:** - **Abstinenz:** Zähle die Tage, bleib stark und kassiere massive XP-Boni für Meilensteine (z.B. 1 Woche, 90 Tage).
  - **Wochenziele:** Lege fest, wie oft pro Woche du eine Aufgabe erledigen willst (z.B. 3x Training).
- **☁️ Cloud-Sync & Auth:** Sicherer Login (ohne E-Mail-Zwang) und Echtzeit-Speicherung deiner Erfolge in der Taverne (Supabase Datenbank).
- **📱 PWA & Wecker:** Installiere die App direkt auf deinem Smartphone (iOS & Android) und richte dir Push-Benachrichtigungen für deinen täglichen Check-In ein.
- **🎨 Immersives Design:** Komplettes Dark-Fantasy UI mit animierten Ladebalken, magischen Toast-Nachrichten, Pergament-Elementen und Konfetti-Explosionen bei Level-Ups.

## 🚀 Tech Stack

- **Frontend:** React.js mit Vite
- **Datenbank & Auth:** Supabase
- **Künstliche Intelligenz:** Google Gemini API (lokal vom User konfigurierbar)
- **Styling:** Custom CSS (Mobile-First, Retro-RPG Theme)
- **Erweiterungen:** `vite-plugin-pwa` (für App-Installation), `canvas-confetti` (für visuelle Belohnungen)

## 📦 Installation & Setup

1. **Repository klonen:**

   ```bash
   git clone [https://github.com/DEIN_USERNAME/DEIN_REPO_NAME.git](https://github.com/DEIN_USERNAME/DEIN_REPO_NAME.git)
   ```

2. **Abhängigkeiten installieren:**

   ```bash
   cd DEIN_REPO_NAME
   npm install
   ```

3. **Umgebungsvariablen einrichten:**
   Erstelle eine `.env` Datei im Hauptverzeichnis und füge deine Supabase-Zugangsdaten ein:

   ```env
   VITE_SUPABASE_URL=deine_supabase_url
   VITE_SUPABASE_ANON_KEY=dein_supabase_anon_key
   ```

   _(Hinweis: Der Google Gemini API-Key wird aus Sicherheitsgründen direkt vom Nutzer in der App in den Profileinstellungen eingetragen und lokal im Browser gespeichert)._

4. **Lokalen Server starten:**
   ```bash
   npm run dev
   ```

## 🛡️ Datenschutz & Privatsphäre

HabitTrack Pro ist für den persönlichen Gebrauch optimiert. KI-Anfragen werden über den eigenen API-Key abgewickelt und sensible Daten (Passwörter, Keys) verlassen den verschlüsselten Auth-Bereich bzw. den lokalen Speicher (`localStorage`) nicht ungesichert.
