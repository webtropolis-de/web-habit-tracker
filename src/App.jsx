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
  const [username, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Lade deine Daten...");
  const [isLoginMode, setIsLoginMode] = useState(true); // true = Login, false = Registrieren

  // -------------------------Funktionen-----------------------------------//

  // Habbit hinzufügen
  const habbithinzufuegen = async () => {
    setLoadingText("Speichere dein neues Habit...");
    setLoading(true);
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
    setLoading(false);
  };

  // Habbit löschen mit confirm
  const habitLoeschen = async (idVonDatenbank, indexInListe) => {
    setLoadingText("Lösche Habit...");
    setLoading(true);
    
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
    setLoading(false);
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
    setLoadingText("Melde dich an...");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login fehlgeschlagen: " + error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoadingText("Melde dich ab...");
    setLoading(true);
    await supabase.auth.signOut();
    setHabits([]); // Liste leeren beim Ausloggen
    setLoading(false);
  };


  // ---------------------db anbindung---------------------------------------//

  // Automatischer Speichervorgang (useEffect)
  // Daten beim Start aus Supabase laden
  // 1. Session prüfen
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) setLoading(false); // Wenn nicht eingeloggt, Lade-Ende
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Daten laden
  useEffect(() => {
    if (user) {
      const datenLaden = async () => {
        setLoading(true); // Spinner AN
        const { data, error } = await supabase
          .from("habits")
          .select("*")
          .order("created_at", { ascending: true });
        
        if (error) console.log("Fehler beim Laden:", error);
        else if (data) setHabits(data);
        
        setLoading(false); // Spinner AUS
      };
      datenLaden();
    }
  }, [user]);


  // ---------------------------- habitReset ----------------------- //

  const habitReset = async (idVonDatenbank, indexInListe) => {
    setLoading(true);
    const resetconfirm = window.confirm ("Möchtest du den Zähler wirklich zurücksetzen?",
    );

    if (resetconfirm == true) {
    const { error } = await supabase
      .from("habits")
      .update({ days: 0 })
      .eq("id", idVonDatenbank);

    if (!error) {
      // 2. Anzeige auf dem Bildschirm aktualisieren
      const neueListe = [...habits];
      neueListe[indexInListe].days = 0;
      setHabits(neueListe);
    }else {
        console.error("Fehler beim Leeren:", error.message);
        alert("Fehler: " + error.message);
      }}
      setLoading(false);
  };

  // ---------------------------- Passwort Validierung --------------//

  const validatePassword = (pw) => {
  return {
    length: pw.length >= 12,
    hasNumber: /\d/.test(pw),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
  };
};

  // ---------------------------- RESET --------------------------- //

  const datenbankLeeren = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  // -------------------------Login Reset Button--------------------------------------------------------------

  const clearLogin = async () => {
    setPassword("");
    setDisplayName("");
    setEmail("");
  }

  //HTML

  return (
    <div className="App">
      {/* Logo bleibt immer oben */}
      <img
        className="logo"
        src={logo}
        alt="Logo"
        style={{ width: "200px", marginBottom: "20px" }}
      />

      {loading ? (
        /* Spinner-Anzeige */
        <div className="spinner-container">
          <div className="spinner"></div>
          <p className="quote">Deine Erfolge werden geladen...</p>
        </div>
        /* weiter mit der User View */
      ) : !user ? (
        <div className="login-view fade-effekt">
    <h1>{isLoginMode ? "Willkommen zurück!" : "Konto erstellen"}</h1>
    
    
    <div className="input-group login-form" style={{ marginTop: "20px" }}>
      <p className="quote">
      {isLoginMode 
        ? "Melde dich an, um deine Habits zu tracken." 
        : "Registriere dich und starte deine Reise."}
    </p>
      {/* Nur bei Registrierung anzeigen */}
      {!isLoginMode && (
        <input
          className="habit-input"
          type="text"
          placeholder="Dein Name"
          value={username}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        
      )}

      
      
      <input
        className="habit-input"
        type="email"
        placeholder="E-Mail Adresse"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      
      <input
        className="habit-input"
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {!isLoginMode && password.length > 0 && (
  <div className="password-hints fade-effekt">
    <p className={validatePassword(password).length ? "valid" : "invalid"}>
      {validatePassword(password).length ? "✔" : "✘"} Mind. 12 Zeichen
    </p>
    <p className={validatePassword(password).hasNumber ? "valid" : "invalid"}>
      {validatePassword(password).hasNumber ? "✔" : "✘"} Eine Zahl enthalten
    </p>
    <p className={validatePassword(password).hasSpecial ? "valid" : "invalid"}>
      {validatePassword(password).hasSpecial ? "✔" : "✘"} Ein Sonderzeichen
    </p>
  </div>
)}

      <div className="login-button" style={{ marginTop: "10px" }}>
        
        {isLoginMode ? (
          <>
            <button onClick={handleLogin} className="login-button">Anmelden</button>
            <p className="toggle-auth">
              
            </p>
          </>
        ) : (
          <>
            <button 
  onClick={handleRegister} 
  className="login-button"
  disabled={!validatePassword(password).length || !validatePassword(password).hasNumber}
  style={{ opacity: (!validatePassword(password).length || !validatePassword(password).hasNumber) ? 0.5 : 1 }}
>
  Registrieren
</button>
            <p className="toggle-auth">
              
              
            </p>
          </>
        )}
      </div>

      <div> 
            
      <div className="button-group" style={{ marginTop: "10px" }}>
        {isLoginMode ? (
          <>
            
            <p className="toggle-auth">
              Noch kein Konto?{" "} <br></br>
              <span onClick={() => { setIsLoginMode(false); clearLogin(); }}>
                Jetzt registrieren
              </span>
            </p>
          </>
        ) : (
          <>
            <p className="toggle-auth">
              Bereits ein Konto?{" "} <br></br>
              <span onClick={() => { setIsLoginMode(true); clearLogin(); }}>
                Zum Login
              </span>
            </p>
          </>
        )}
      </div>      
            
            
            
            
            
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

                

                <input
                  className="goal-input"
                  type="number"
                  value={zielWert}
                  onChange={(e) => setZielWert(e.target.value)}
                  placeholder="Ziel"
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
              <div className="dangercard stats-view fade-effekt" key="stats-view">
              <h3> ⚠️ Developer Optionen</h3>
              <p><button onClick={datenbankLeeren} className="danger-button">
                🔥 Gesamte Datenbank leeren
              </button></p></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
