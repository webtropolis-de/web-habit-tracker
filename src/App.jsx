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
  const [habits, setHabits] = useState([]);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setDisplayName] = useState("User");

  // -------------------------Funktionen-----------------------------------//

  // Habbit hinzufügen
  const habbithinzufuegen = async () => {
    if (eingabeWert.trim() === "") return;

    const neuesHabit = {
      name: eingabeWert,
      days: 0,
      icon: icon,
      goal: Number(zielWert),
    };

    // die Daten (inkl. ID) zurückbekommen
    const { data, error } = await supabase
      .from("habits")
      .insert([neuesHabit])
      .select(); // <--- DAS ist der magische Befehl!

    if (!error && data) {
      // data[0] ist das vollständige Habit, das gerade in der DB erstellt wurde
      setHabits([...habits, data[0]]);
      setInputValue("");
      setZielWert(""); // Leert auch das Zielfeld
    } else {
      console.error("Supabase Error:", error);
      alert("Fehler beim Speichern in der Cloud!");
    }
  };

  // Habbit löschen mit confirm
  const habitLoeschen = async (idVonDatenbank, indexInListe) => {
    const wirklichLoeschen = window.confirm(
      "Möchtest du dieses Habit wirklich löschen?",
    );

    if (!wirklichLoeschen) return;

    //  HABBIT  löschen (wir suchen nach der ID)
    const { error } = await supabase
      .from("habits")
      .delete()
      .eq("id", idVonDatenbank);

    if (error) {
      console.error("Fehler beim Löschen:", error.message);
      alert("Konnte nicht in der Datenbank gelöscht werden.");
    } else {
      //Erst wenn es in der Cloud weg ist, löschen wir es lokal aus dem State
      const neueListe = habits.filter((_, i) => i !== indexInListe);
      setHabits(neueListe);
    }
  };

  // ---------------------+1 Funktion-------------------------------------//
  const tagHinzufuegen = async (idVonDatenbank, indexInListe) => {
    const neuerWert = habits[indexInListe].days + 1;

    // 1. Supabase informieren
    const { error } = await supabase
      .from("habits")
      .update({ days: neuerWert })
      .eq("id", idVonDatenbank);

    if (!error) {
      // 2. Anzeige auf dem Bildschirm aktualisieren
      const neueListe = [...habits];
      neueListe[indexInListe].days = neuerWert;
      setHabits(neueListe);
    }
  };
  // -----------------Emojis-----------------------------------------//

  // Emojis speichern
  const onEmojiClick = (emojiData) => {
    setIcon(emojiData.emoji);
    setZeigePicker(false);
  };

  // -------------------- Tage & Wochen berechnenn ------------------- //
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

  // ---------------------- LOGIN System -------------------------------------//

  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({ email, password, options: {
      data: {
        display_name: username, 
      }
    }});
    if (error) alert("Registrierung fehlgeschlagen: " + error.message);
    else alert("Check deine E-Mails für den Bestätigungslink!");
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login fehlgeschlagen: " + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setHabits([]); // Liste leeren beim Ausloggen
  };


  // ---------------------db anbindung---------------------------------------//

  // Automatischer Speichervorgang (useEffect)
  // Daten beim Start aus Supabase laden
  useEffect(() => {
    // Prüfen, ob schon jemand eingeloggt ist
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Auf Änderungen (Login/Logout) hören
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Daten laden, sobald ein User da ist
  useEffect(() => {
    if (user) {
      const datenLaden = async () => {
        const { data, error } = await supabase
          .from("habits")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) console.log("Fehler beim Laden:", error);
        else if (data) setHabits(data);
      };
      datenLaden();
    }
  }, [user]);

  // ---------------------------- RESET --------------------------- //

  const datenbankLeeren = async () => {
    const bestaetigung = window.confirm(
      "Möchtest du wirklich ALLE Habits unwiderruflich aus der Datenbank löschen?",
    );

    if (bestaetigung) {
      // Der SQL-Trick: Lösche alles, wo die ID größer als 0 ist
      const { error } = await supabase.from("habits").delete().gt("id", 0);

      if (!error) {
        setHabits([]); // Auch auf dem Bildschirm alles leeren
        alert("Datenbank wurde komplett geleert!");
      } else {
        console.error("Fehler beim Leeren:", error.message);
        alert("Fehler: " + error.message);
      }
    }
  };

  // ---------------------------------------------------------------------------------------

  //HTML

  return (
    <div className="App">
      {/* Das Logo bleibt immer oben sichtbar */}
      <img
        className="logo"
        src={logo}
        alt="Logo"
        style={{ width: "200px", marginBottom: "20px" }}
      />

      {!user ? (
        /* --- 1. ANSICHT: LOGIN / REGISTRIERUNG --- */
        <div className="login-view fade-effekt">
          <h1>Willkommen bei Habitrack!</h1>
          <p className="quote">Bitte melde dich an, um deine Habits zu sehen.</p>
          
          <div className="input-group login-form" style={{ marginTop: "20px" }}>
            <input
        className="habit-input"
        type="text"
        placeholder="Dein Name (für Registrierung)"
        value={username}
        onChange={(e) => setDisplayName(e.target.value)}
      />
            
            <input
              className="habit-input"
              type="email"
              required
              placeholder="E-Mail Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="habit-input"
              type="password"
              required
              minlength="12"
              placeholder="Passwort (min 12 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          

            <div className="button-group" style={{ marginTop: "10px" }}>
              <button onClick={handleLogin} className="add-button">
                Anmelden
              </button>
              <button onClick={handleRegister} className="reset-button">
                Registrieren
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* --- 2. ANSICHT: DEIN TRACKER (Eingeloggt) --- */
        <>
          {/* NAVIGATION */}
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
            {/* Neuer Logout Button */}
            <button onClick={handleLogout} className="delete-button" style={{ marginLeft: "auto" }}>
              🚪 Logout
            </button>
          </nav>

          {aktuelleAnsicht === "home" ? (
            /* --- TRACKER HOME VIEW --- */
            <div className="home-view fade-effekt" key="home-view">
              <h1>Schön, dass du da bist {user.user_metadata.display_name}!</h1>
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
                      <div
                        className="progress-bar"
                        style={{
                          width: `${Math.min((habit.days / (habit.goal || 1)) * 100, 100)}%`,
                        }}
                      ></div>
                      <span className="progress-percentage">
                        {Math.round((habit.days / (habit.goal || 1)) * 100)}%
                      </span>
                    </div>

                    <p className="progress-text">
                      {habit.days} / {habit.goal} Tage
                    </p>

                    <p className="start-date">
                      Start:{" "}
                      {habit.created_at
                        ? new Date(habit.created_at).toLocaleDateString()
                        : "Unbekannt"}
                    </p>
                    
                    <button
                      onClick={() => tagHinzufuegen(habit.id, index)}
                      className="plus-button"
                    >
                      +1 Tag geschafft!
                    </button>
                    
                    <div className="button-group">
                      <button
                        onClick={() => habitReset(habit.id, index)}
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
            /* --- STATS VIEW --- */
            <div className="stats-view fade-effekt" key="stats-view">
              <h1>Deine Erfolge 🏆</h1>
              <div className="stats-card">
                <p>Insgesamt geschaffte Tage </p>
                <h2>
                  {berechnenWochen(habits.reduce((sum, h) => sum + h.days, 0))}
                </h2>
                
              
              </div>
              <p>Nur deine persönlichen Daten sind hier sichtbar.</p>
              <p><button onClick={datenbankLeeren} className="danger-button">
                🔥 Gesamte Datenbank leeren
              </button></p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
