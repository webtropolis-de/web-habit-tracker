import { useState, useEffect, useRef } from "react";
import "./App.css"; // Stylesheet importieren
import logo from "./assets/logo.png"; // Logo importieren
import EmojiPicker from "emoji-picker-react"; // Emoji Picker
import { supabase } from "./supabaseClient";
import { berechnenWochen, holeZufallsSpruch, validatePassword, istNeueWoche } from "./helper";
import { habitService } from "./habitService"; // Supabase Services


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
  const [spruch] = useState(holeZufallsSpruch());
  const [habitType, setHabitType] = useState("abstinenz"); // abstinenz oder wochenziel
  const [frequency, setFrequency] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
      type: habitType,                   
      frequency: Number(frequency) || 0,
    };

    // die Daten (inkl. ID) zurückbekommen (aus habitService)
    const { data, error } = await habitService.habbithinzufuegen(neuesHabit); 

    if (!error && data) {
      // data[0] ist das vollständige Habit, das gerade in der DB erstellt wurde
      setHabits([...habits, data[0]]);
      setInputValue("");
      setZielWert(""); // Leert auch das Zielfeld
      setFrequency("");
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

    //  HABBIT  löschen (wir suchen nach der ID) (aus habitService)
    const { error } = await habitService.habitLoeschen(idVonDatenbank);

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
    const aktuellesHabit = habits[indexInListe];

    // NEU: Sperre für Wochenziele einbauen
    if (aktuellesHabit.type === "wochenziel" && aktuellesHabit.days >= aktuellesHabit.frequency) {
      alert("Du hast dein Wochenziel für diese Woche schon erreicht! 🎉");
      return; // Bricht die Funktion hier ab, es wird nicht weiter hochgezählt!
    }

    const neuerWert = aktuellesHabit.days + 1;

    // DB  informieren (aus habitService)
    const { error } = await habitService.tageUpdaten(idVonDatenbank, neuerWert);

    if (!error) {
      // Anzeige aktualisieren
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

  
  // ---------------------- Profil Updates -------------------------------------//
  const updateName = async () => {
    if (!newName.trim()) return;
    setLoadingText("Aktualisiere Namen...");
    setLoading(true);
    
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: newName }
    });
    
    if (error) {
      alert("Fehler beim Ändern des Namens: " + error.message);
    } else {
      alert("Name erfolgreich geändert!");
      setUser(data.user); // Aktualisiert den Namen direkt auf dem Bildschirm
      setNewName("");
    }
    setLoading(false);
  };

  const updatePassword = async () => {
    if (!validatePassword(newPassword).length || !validatePassword(newPassword).hasNumber) {
      alert("Passwort erfüllt nicht die Kriterien.");
      return;
    }
    setLoadingText("Aktualisiere Passwort...");
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      alert("Fehler beim Ändern des Passworts: " + error.message);
    } else {
      alert("Passwort erfolgreich geändert!");
      setNewPassword("");
    }
    setLoading(false);
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

// --------------------- 2. Daten laden -------------------------------------
useEffect(() => {
  if (user) {
    const datenLaden = async () => {
      setLoading(true); // Spinner AN

      // (aus habitService)
      const { data, error } = await habitService.datenLaden();

      if (error) {
        console.log("Fehler beim Laden:", error);
      } else if (data) {
        // Prüfen, ob wir Wochenziele auf 0 setzen müssen ---
        let aktuelleHabits = [...data];

        for (let i = 0; i < aktuelleHabits.length; i++) {
          const habit = aktuelleHabits[i];

          // Wenn es ein Wochenziel ist UND die helper.js sagt "Neue Woche!"
          if (habit.type === "wochenziel" && istNeueWoche(habit.last_reset)) {
            //In der Cloud auf 0 setzen
            await habitService.wochenReset(habit.id);
            //Auf dem Bildschirm auf 0 setzen
            aktuelleHabits[i].days = 0;
            aktuelleHabits[i].last_reset = new Date().toISOString();
          }
        }

        setHabits(aktuelleHabits);
      }

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
    
    // (aus habitService)
    const { error } = await habitService.tageUpdaten(idVonDatenbank, 0);

    if (!error) {
      // Anzeige  aktualisieren
      const neueListe = [...habits];
      neueListe[indexInListe].days = 0;
      setHabits(neueListe);
    }else {
        console.error("Fehler beim Leeren:", error.message);
        alert("Fehler: " + error.message);
      }}
      setLoading(false);
  };



  // ---------------------------- Total RESET --------------------------- //

  const datenbankLeeren = async () => {
    setLoading(true);
    const bestaetigung = window.confirm(
      "Möchtest du wirklich ALLE Habits unwiderruflich aus der Datenbank löschen?",
    );

    if (bestaetigung) {
      // Lösche alles, wo die ID größer als 0 ist (aus habitService)
      const { error } = await habitService.datenbankLeeren();

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
      {/* Logo immer oben */}
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
        /* weiter mit User View */
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
            <p className="toggle-auth"></p>
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
        /* --- 2. ANSICHT: TRACKER (Eingeloggt) --- */
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
            <button
              onClick={() => setAktuelleAnsicht("profile")}
              className={aktuelleAnsicht === "profile" ? "active" : ""}
            >
              👤 Profil
            </button>

            {/*Logout Button */}
            <button onClick={handleLogout} className="delete-button" style={{ marginLeft: "auto" }}>
              🚪 Logout
            </button>
          </nav>

          

          {/* --- 1. ANSICHT: TRACKER HOME VIEW --- */}
          {aktuelleAnsicht === "home" && (
            <div className="home-view fade-effekt" key="home-view">
              <h1>Schön, dass du da bist {user.user_metadata.display_name}!</h1>
              <p className="quote">{spruch}</p>

              <div className="input-group" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                {/* 1. Moderne Typ-Auswahl */}
                <div className="type-selector" style={{ display: "flex", justifyContent: "center", gap: "15px" }}>
                  <button
                    type="button"
                    onClick={() => setHabitType("abstinenz")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "25px",
                      border: habitType === "abstinenz" ? "2px solid #007bff" : "1px solid #444",
                      backgroundColor: habitType === "abstinenz" ? "rgba(0, 123, 255, 0.15)" : "transparent",
                      color: habitType === "abstinenz" ? "#fff" : "#aaa",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "all 0.2s ease-in-out"
                    }}
                  >
                    ⏳ Abstinenz (Zähler)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitType("wochenziel")}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "25px",
                      border: habitType === "wochenziel" ? "2px solid #007bff" : "1px solid #444",
                      backgroundColor: habitType === "wochenziel" ? "rgba(0, 123, 255, 0.15)" : "transparent",
                      color: habitType === "wochenziel" ? "#fff" : "#aaa",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "all 0.2s ease-in-out"
                    }}
                  >
                    📅 Wochenziel (z.B. Sport)
                  </button>
                </div>

                {/* 2. Die Eingabefelder sauber in einer Reihe darunter */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                  <input
                    className="habit-input"
                    type="text"
                    placeholder="Was möchtest du tracken?"
                    value={eingabeWert}
                    onChange={(e) => setInputValue(e.target.value)}
                    style={{ flex: 1, minWidth: "220px", margin: 0 }}
                  />

                  {habitType === "abstinenz" ? (
                    <input
                      className="goal-input"
                      type="number"
                      value={zielWert}
                      onChange={(e) => setZielWert(e.target.value)}
                      placeholder="Ziel in Tagen"
                      style={{ width: "130px", margin: 0 }}
                    />
                  ) : (
                    <input
                      className="goal-input"
                      type="number"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      placeholder="Wie oft/Woche?"
                      style={{ width: "150px", margin: 0 }}
                    />
                  )}

                  <div className="emoji-section">
                    <button
                      type="button"
                      className="emoji-trigger-btn"
                      onClick={() => setZeigePicker(!zeigePicker)}
                      style={{ margin: 0 }}
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

                  <button onClick={habbithinzufuegen} className="add-button" style={{ margin: 0 }}>
                    Hinzufügen
                  </button>
                </div>
              </div>

              <ul className="habit-grid">
                {habits.map((habit, index) => {
                  const isWochenziel = habit.type === "wochenziel";
                  const zielGroeße = isWochenziel ? habit.frequency : habit.goal;
                  const istErledigt = habit.days >= zielGroeße && zielGroeße > 0;
                  const prozent = Math.min((habit.days / (zielGroeße || 1)) * 100, 100);

                  return (
                    <li
                      key={habit.id || index}
                      className={
                        "habit-card fade-in-view" +
                        (istErledigt ? " erledigt" : "")
                      }
                    >
                      <div className="habit-icon">{habit.icon || "🔥"}</div>
                      {istErledigt && (
                        <span className="success-badge">⭐ Ziel erreicht!</span>
                      )}
                      
                      <span className="type-badge" style={{ fontSize: "0.7rem", opacity: 0.7, display: "block", marginBottom: "5px" }}>
                        {isWochenziel ? "📅 Wöchentlich" : "⏳ Zähler"}
                      </span>
                      
                      <h3 className="habit-name">{habit.name}</h3>

                      <div className="progress-container">
                        <div
                          className="progress-bar"
                          style={{ width: `${prozent}%` }}
                        ></div>
                        <span className="progress-percentage">
                          {Math.round(prozent)}%
                        </span>
                      </div>

                      <p className="progress-text">
                        {isWochenziel
                          ? `${habit.days} / ${habit.frequency} Mal pro Woche`
                          : `${habit.days} / ${habit.goal} Tage`}
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
                        disabled={isWochenziel && istErledigt} 
                        style={{ 
                          opacity: (isWochenziel && istErledigt) ? 0.5 : 1, 
                          cursor: (isWochenziel && istErledigt) ? "not-allowed" : "pointer" 
                        }}
                      >
                        {isWochenziel ? "+1 Mal geschafft!" : "+1 Tag geschafft!"}
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
                  );
                })}
              </ul>
            </div>
          )}

          {/* --- 2. ANSICHT: STATS VIEW --- */}
          {aktuelleAnsicht === "stats" && (
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
                <p>
                  <button onClick={datenbankLeeren} className="danger-button">
                    🔥 Gesamte Datenbank leeren
                  </button>
                </p>
              </div>
            </div>
          )}
          
          {/* --- 3. ANSICHT: PROFILE VIEW --- */}
          {aktuelleAnsicht === "profile" && (
            <div className="profile-view fade-effekt" key="profile-view">
              <h1>Dein Account ⚙️</h1>
              <div className="stats-card">
                <p style={{ marginBottom: "20px" }}>Angemeldet als: <br/><strong style={{ color: "#007bff" }}>{user.email}</strong></p>
                
                <h3 style={{ marginTop: "20px", borderBottom: "1px solid #444", paddingBottom: "10px", textAlign: "left" }}>Name ändern</h3>
                {/* NEU: flexDirection "column" stapelt die Felder sauber untereinander */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                  <input
                    className="habit-input"
                    type="text"
                    placeholder={`Aktuell: ${user.user_metadata.display_name}`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ margin: 0, width: "100%", boxSizing: "border-box" }}
                  />
                  <button onClick={updateName} className="add-button" style={{ margin: 0, width: "100%" }}>Speichern</button>
                </div>

                <h3 style={{ marginTop: "30px", borderBottom: "1px solid #444", paddingBottom: "10px", textAlign: "left" }}>Passwort ändern</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                  <input
                    className="habit-input"
                    type="password"
                    placeholder="Neues Passwort"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ margin: 0, width: "100%", boxSizing: "border-box" }}
                  />
                  <button onClick={updatePassword} className="add-button" style={{ margin: 0, width: "100%" }}>Aktualisieren</button>
                </div>
                
                {/* Zeigt die Regeln nur an, wenn man gerade tippt */}
                {newPassword.length > 0 && (
                  <div className="password-hints fade-effekt" style={{ marginTop: "15px", textAlign: "left" }}>
                    <p className={validatePassword(newPassword).length ? "valid" : "invalid"}>
                      {validatePassword(newPassword).length ? "✔" : "✘"} Mind. 12 Zeichen
                    </p>
                    <p className={validatePassword(newPassword).hasNumber ? "valid" : "invalid"}>
                      {validatePassword(newPassword).hasNumber ? "✔" : "✘"} Eine Zahl enthalten
                    </p>
                    <p className={validatePassword(newPassword).hasSpecial ? "valid" : "invalid"}>
                      {validatePassword(newPassword).hasSpecial ? "✔" : "✘"} Ein Sonderzeichen
                    </p>
                  </div>
                )}
          </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;