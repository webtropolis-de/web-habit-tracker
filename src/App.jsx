import { useState, useEffect } from "react";
import "./App.css"; // Stylesheet importieren
import logo from "./assets/logo.png"; // Logo importieren

function App() {
  // Speicher deklarieren
  const [eingabeWert, setInputValue] = useState("");
  const [zielWert, setZielWert] = useState("");

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
  const habbithinzufuegen = () => {
    //Nichts tun, wenn das Feld leer ist
    if (eingabeWert.trim() === "") return;
    setHabits([
      ...habits,
      {
        name: eingabeWert,
        days: 0,
        goal: Number(zielWert),
      },
    ]);
    setInputValue("");
  };

  // Habbit löschen mit confirm
  const habitLoeschen = (indexZumLoeschen) => {
    const wirklichLoeschen = window.confirm(
      "Möchtest du dieses Habit wirklich löschen?",
    );

    if (wirklichLoeschen == false) {
      return;
    }
    // Wir filtern die Liste: Behalte alle Einträge, deren Position (i) NICHT
    // die Position ist, die wir löschen wollen (indexZumLoeschen).
    const neueListe = habits.filter((_, i) => i !== indexZumLoeschen);

    // Die neue Liste im Speicher ablegen
    setHabits(neueListe);
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

  // ------------------------------------------------------------//

  // 3. Automatischer Speichervorgang (useEffect)
  useEffect(() => {
    localStorage.setItem("meineHabits", JSON.stringify(habits));
  }, [habits]);

  // ------------------------------------------------------------//

  // 4. HTML
  return (
    <div>
      <img
        className="logo"
        src={logo}
        alt="Logo"
        style={{ width: "200px", marginBottom: "20px" }}
      />
      <h1>Willkommen!</h1>

      <input
        className="habit-input"
        type="text"
        placeholder="Was möchtest du tracken?"
        value={eingabeWert}
        onChange={(e) => setInputValue(e.target.value)}
      />

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

      <ul className="habit-grid">
        {" "}
        {habits.map((habit, index) => (
          <li key={index} className="habit-card">
            <div className="habit-icon">🔥</div> {/* Das Icon */}
            <h3 className="habit-name">{habit.name}</h3>
            <div className="progress-container">
              <div
                className="progress-bar"
                style={{ width: `${Math.min((habit.days / 30) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="progress-text">
              {habit.days} / {habit.goal} Tage
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
                onClick={() => habitLoeschen(index)}
                className="delete-button"
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
