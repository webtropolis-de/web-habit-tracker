import { useState, useEffect, useRef } from "react";
import "./App.css"; // Stylesheet importieren
import logo from "./assets/logo.png"; // Logo importieren
import EmojiPicker from "emoji-picker-react"; // Emoji Picker
import { supabase } from "./supabaseClient";

// Zufallssprüche Array
const sprueche = [
  "Jeder Tag ist ein neuer Sieg!",
  "Bleib stark, es lohnt sich",
  "Dein zukünftiges Ich wird dir danken",
  "Einfach weiteratmen und weitermachen",
  "Disziplin ist die Brücke zwischen Zielen und Erfolg",
];

// Speicher / States deklarieren
const zufallsSpruch = sprueche[Math.floor(Math.random() * sprueche.length)]; //  zufälligen Spruch auswählen

function App() {
  const [aktuelleAnsicht, setAktuelleAnsicht] = useState("home");
  const [eingabeWert, setInputValue] = useState("");
  const [zielWert, setZielWert] = useState("");
  const [zeigePicker, setZeigePicker] = useState(false);
  const [icon, setIcon] = useState("🔥"); // Standard-Emoji
  const [habits, setHabits] = useState(() => {
    const gespeicherteDaten = localStorage.getItem("meineHabits");
    if (gespeicherteDaten) {
      return JSON.parse(gespeicherteDaten);
    } else {
      return [];
    }
  });

  // -------------------------Funktionen-----------------------------------//

  // Habbit hinzufügen
  const habbithinzufuegen = async () => {
    if (eingabeWert.trim() === "") return;

    const neuesHabit = {
      name: eingabeWert,
      days: 0,
      icon: icon,
      goal: Number(zielWert),
      // erstelltAm: new Date().toLocaleDateString(),
    };

    // AB IN DIE CLOUD!
    const { error } = await supabase.from("habits").insert([neuesHabit]);

    if (!error) {
      // Wenn in der Cloud alles okay ist, aktualisieren wir auch unseren Screen
      setHabits([...habits, neuesHabit]);
      setInputValue("");
    } else {
      alert("Fehler beim Speichern in der Cloud!");
    }
  };

  // Habbit löschen mit confirm
  const habitLoeschen = async (idVonDatenbank, indexInListe) => {
    const wirklichLoeschen = window.confirm(
      "Möchtest du dieses Habit wirklich löschen?",
    );

    if (!wirklichLoeschen) return;

    // 1. In Supabase löschen (wir suchen nach der ID)
    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", idVonDatenbank);

    if (error) {
      console.error("Fehler beim Löschen:", error.message);
      alert("Konnte nicht in der Datenbank gelöscht werden.");
    } else {
      // 2. Erst wenn es in der Cloud weg ist, löschen wir es lokal aus dem State
      const neueListe = habits.filter((_, i) => i !== indexInListe);
      setHabits(neueListe);
    }
  };

  // Reset Funktion
  const habitReset = (indexZumReset) => {
    const bestaetigen = window.confirm(
      "Möchtest du den Zähler wirklich zurücksetzen?",
    );
    if (bestaetigen == false) return;
    const neueListe = [...habits];
    neueListe[indexZumReset].days = 0;
    setHabits(neueListe);
  };

  // +1 Funktion
  const tagHinzufuegen = (indexZumAendern) => {
    // aktuelle Liste kopieren
    const neueListe = [...habits];

    // +1
    neueListe[indexZumAendern].days = neueListe[indexZumAendern].days + 1;

    // neue liste speichern
    setHabits(neueListe);
  };

  // Emojis speichern
  const onEmojiClick = (emojiData) => {
    setIcon(emojiData.emoji);
    setZeigePicker(false);
  };

  const allesloeschen = () => {
    const bestaetigung = window.confirm(
      "Möchtest du wirklich ALLE Habits und Fortschritte unwiderruflich löschen?",
    );
    if (bestaetigung == true) {
      setHabits([]);
      window.confirm("Der Tracker wurde zurückgesetzt!");
    }
  };

  const berechnenWochen = (gesamtTage) => {
    //Berechne die Wochen
    const wochen = Math.floor(gesamtTage / 7);
    // Berechne die restlichen Tage
    const tage = gesamtTage % 7;
    //Antwort-Satz
    return (
      wochen +
      " " +
      (wochen == 1 ? "Woche" : "Wochen") +
      " und " +
      tage +
      " " +
      (tage == 1 ? "Tag" : "Tage")
    );
  };

  // ------------------------------------------------------------//

  // Automatischer Speichervorgang (useEffect) Local Storage + DB
  // Daten beim Start aus Supabase laden
  useEffect(() => {
    const datenLaden = async () => {
      const { data, error } = await supabase.from("habits").select("*");
      if (error) console.log("Fehler beim Laden:", error);
      else if (data) setHabits(data);
    };

    datenLaden();
  }, []);
  // Daten bei jeder Änderung in Supabase SPEICHERN (optionaler Zwischenschritt)
  // Hinweis: Wir bauen das gleich direkt in deine Funktionen ein, das ist sauberer!
  // ------------------------------------------------------------//

  //HTML

  return (
    <div className="App">
      <img
        className="logo"
        src={logo}
        alt="Logo"
        style={{ width: "200px", marginBottom: "20px" }}
      />
      {/* NAV (Immer sichtbar) */}
      <nav className="nav-bar">
        <button
          onClick={() => setAktuelleAnsicht("home")}
          className={aktuelleAnsicht === "home" ? "active" : ""}
        >
          🏠 Tracker
        </button>
        <button
          onClick={() => setAktuelleAnsicht("stats")}
          className={aktuelleAnsicht === "stats" ? "active" : ""}
        >
          📊 Statistik
        </button>
      </nav>

      {/* WECHSELER */}
      {aktuelleAnsicht === "home" ? (
        /* --- DIESER TEIL WIRD BEI "HOME" ANGEZEIGT --- */
        <div className="home-view fade-effekt" key="home-view">
          <h1>Willkommen!</h1>
          <p className="quote">{zufallsSpruch}</p>

          <div className="input-group">
            <input
              className="habit-input"
              type="text"
              placeholder="Was möchtest du tracken?"
              value={eingabeWert}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <div className="emoji-section">
              <button
                type="button"
                className="emoji-trigger-btn"
                onClick={() => setZeigePicker(!zeigePicker)}
              >
                {icon}
              </button>

              {zeigePicker && (
                <>
                  <div
                    className="emoji-overlay"
                    onClick={() => setZeigePicker(false)}
                  />
                  <div className="emoji-picker-container">
                    <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                  </div>
                </>
              )}
            </div>

            <input
              className="goal-input"
              type="number"
              value={zielWert}
              onChange={(e) => setZielWert(e.target.value)}
              placeholder="Ziel"
            />

            <button onClick={habbithinzufuegen} className="add-button">
              Hinzufügen
            </button>
          </div>

          <ul className="habit-grid">
            {habits.map((habit, index) => (
              <li
                key={habit.id || index}
                className={
                  "habit-card fade-in-view" +
                  (habit.days >= habit.goal ? " erledigt" : "")
                }
              >
                <div className="habit-icon">{habit.icon || "🔥"}</div>
                {habit.days >= habit.goal && (
                  <span className="success-badge">⭐ Ziel erreicht!</span>
                )}
                <h3 className="habit-name">{habit.name}</h3>

                <div className="progress-container">
                  {/* 1. Der wachsende Balken im Hintergrund */}
                  <div
                    className="progress-bar"
                    style={{
                      width: `${Math.min((habit.days / (habit.goal || 1)) * 100, 100)}%`,
                    }}
                  ></div>

                  {/* 2. Die Prozentzahl schwebt IMMER mittig im Container */}
                  <span className="progress-percentage">
                    {Math.round((habit.days / (habit.goal || 1)) * 100)}%
                  </span>
                </div>

                <p className="progress-text">
                  {habit.days} / {habit.goal} Tage
                </p>

                <p className="start-date">
                  Start: {habit.erstelltAm || "Unbekannt"}
                </p>
                <button
                  onClick={() => tagHinzufuegen(index)}
                  className="plus-button"
                >
                  +1 Tag geschafft!
                </button>
                <div className="button-group">
                  <button
                    onClick={() => habitReset(index)}
                    className="reset-button"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => habitLoeschen(habit.id, index)}
                    className="delete-button fade-effekt"
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        /* --- DIESER TEIL WIRD BEI "STATS" ANGEZEIGT --- */
        <div className="stats-view fade-effekt" key="stats-view">
          <h1>Deine Erfolge 🏆</h1>
          <div className="stats-card">
            <p>Insgesamt geschaffte Tage </p>
            <h2>
              {berechnenWochen(habits.reduce((sum, h) => sum + h.days, 0))}
            </h2>
          </div>
          <p>Hier bauen wir bald die Monats-Grafik ein!</p>
          <button onClick={allesloeschen} className="danger-button ">
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
