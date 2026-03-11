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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
  const habitLoeschen = async (id, index) => {
    // Bestätigungs-Dialog abfragen
    if (!window.confirm("Möchtest du diesen Habit wirklich löschen?")) {
      // WICHTIG: Falls der User abbricht, darf setLoading nicht auf true hängen bleiben
      return; 
    }

    setLoading(true); // Spinner erst starten, wenn der User bestätigt hat
    try {
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Lokal aus dem State entfernen
      const neueHabits = habits.filter((_, i) => i !== index);
      setHabits(neueHabits);
    } catch (error) {
      console.error("Fehler beim Löschen:", error.message);
      alert("Fehler beim Löschen des Habits.");
    } finally {
      setLoading(false); // Spinner stoppen, egal ob Erfolg oder Fehler
    }
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

  // --- AB HIER ERSETZEN --- //
  return (
    <div className="App">
      
      {loading ? (
        /* Spinner-Anzeige - Jetzt garantiert zentriert */
        <div className="spinner-container" style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          position: "fixed",
          top: 0,
          left: 0,
          backgroundColor: "#121214",
          zIndex: 2000
        }}>
          <img className="logo" src={logo} alt="Logo" style={{ width: "150px", marginBottom: "30px" }} />
          <div className="spinner"></div>
          <p className="quote" style={{ marginTop: "20px" }}>Deine Erfolge werden geladen...</p>
        </div>
      ) : !user ? (
        <div className="login-view fade-effekt">
          {/* Logo in Login Ansicht */}
          <img className="logo" src={logo} alt="Logo" style={{ width: "150px", marginBottom: "10px" }} />
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
                <button onClick={handleLogin} className="login-button">Anmelden</button>
              ) : (
                <button 
                  onClick={handleRegister} 
                  className="login-button"
                  disabled={!validatePassword(password).length || !validatePassword(password).hasNumber}
                  style={{ opacity: (!validatePassword(password).length || !validatePassword(password).hasNumber) ? 0.5 : 1 }}
                >
                  Registrieren
                </button>
              )}
            </div>

            <div className="button-group" style={{ marginTop: "10px" }}>
              {isLoginMode ? (
                <p className="toggle-auth">
                  Noch kein Konto?{" "} <br></br>
                  <span onClick={() => { setIsLoginMode(false); clearLogin(); }}>
                    Jetzt registrieren
                  </span>
                </p>
              ) : (
                <p className="toggle-auth">
                  Bereits ein Konto?{" "} <br></br>
                  <span onClick={() => { setIsLoginMode(true); clearLogin(); }}>
                    Zum Login
                  </span>
                </p>
              )}
            </div>      
          </div>
        </div>
      ) : (
        /* --- EINGELOGGT-BEREICH --- */
        <>
          {/* --- NEUE HEADER-LEISTE (Burger + Logo links, Titel mittig) --- */}
          {/* --- MODERNISIERTER HEADER --- */}
          <header style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            padding: "10px 20px", 
            borderBottom: "1px solid #333", 
            backgroundColor: "#1e1e24",
            position: "sticky",
            top: 0,
            zIndex: 100
          }}>
            
            {/* 1. Burger Menü (Links) */}
            <button
              onClick={() => setIsMenuOpen(true)}
              style={{ background: "none", border: "none", fontSize: "28px", color: "white", cursor: "pointer", padding: 0, width: "40px", textAlign: "left" }}
            >
              ☰
            </button>

            {/* 2. Überschrift (Zentriert) */}
            <h2 style={{ 
              margin: 0, 
              fontSize: "1.2rem", 
              color: "#fff", 
              textAlign: "center", 
              flexGrow: 1,
              fontWeight: "600"
            }}>
              {aktuelleAnsicht === "home" ? "Tracker" : aktuelleAnsicht === "stats" ? "Statistik" : "Profil"}
            </h2>

            {/* 3. Logo (Rechts) */}
            <div style={{ width: "40px", display: "flex", justifyContent: "flex-end" }}>
              <img
                src={logo}
                alt="Logo"
                style={{ height: "30px", width: "auto" }}
              />
            </div>
          </header>

          {/* --- DAS AUSKLAPPBARE SIDEBAR-MENÜ --- */}
          <>
            {/* Dunkler Hintergrund mit weichem Fade-In */}
            <div
              style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0,0,0,0.6)", zIndex: 998,
                opacity: isMenuOpen ? 1 : 0,
                visibility: isMenuOpen ? "visible" : "hidden",
                transition: "opacity 0.3s ease, visibility 0.3s ease"
              }}
              onClick={() => setIsMenuOpen(false)}
            ></div>

            {/* Das eigentliche Menü-Fenster mit weichem Slide-In */}
            <div
              style={{
                position: "fixed", top: 0, left: 0, bottom: 0, width: "250px",
                backgroundColor: "#16161a", padding: "20px", zIndex: 999,
                display: "flex", flexDirection: "column", gap: "10px",
                boxShadow: isMenuOpen ? "4px 0 15px rgba(0,0,0,0.8)" : "none",
                transform: isMenuOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease"
              }}
            >
              <h2 style={{ color: "#fff", borderBottom: "1px solid #444", paddingBottom: "15px", marginTop: "10px", marginBottom: "20px" }}>Menü</h2>
              
              <button
                onClick={() => { setAktuelleAnsicht("home"); setIsMenuOpen(false); }}
                style={{ background: "none", border: "none", color: aktuelleAnsicht === "home" ? "#007bff" : "#aaa", textAlign: "left", fontSize: "1.2rem", cursor: "pointer", padding: "10px 0", fontWeight: aktuelleAnsicht === "home" ? "bold" : "normal" }}
              >
                🏠 Tracker
              </button>
              <button
                onClick={() => { setAktuelleAnsicht("stats"); setIsMenuOpen(false); }}
                style={{ background: "none", border: "none", color: aktuelleAnsicht === "stats" ? "#007bff" : "#aaa", textAlign: "left", fontSize: "1.2rem", cursor: "pointer", padding: "10px 0", fontWeight: aktuelleAnsicht === "stats" ? "bold" : "normal" }}
              >
                📊 Statistik
              </button>
              <button
                onClick={() => { setAktuelleAnsicht("profile"); setIsMenuOpen(false); }}
                style={{ background: "none", border: "none", color: aktuelleAnsicht === "profile" ? "#007bff" : "#aaa", textAlign: "left", fontSize: "1.2rem", cursor: "pointer", padding: "10px 0", fontWeight: aktuelleAnsicht === "profile" ? "bold" : "normal" }}
              >
                👤 Profil
              </button>

              <div style={{ flexGrow: 1 }}></div>

              <button
                onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                style={{ background: "none", border: "none", color: "#ff4d4d", textAlign: "left", fontSize: "1.2rem", cursor: "pointer", padding: "15px 0", borderTop: "1px solid #444" }}
              >
                🚪 Logout
              </button>
            </div>
          </>

          {/* --- 1. ANSICHT: TRACKER HOME VIEW --- */}
          {aktuelleAnsicht === "home" && (
            <div className="home-view fade-effekt" key="home-view">
              <h1>Schön, dass du da bist {user.user_metadata.display_name}!</h1>
              <p className="quote">{spruch}</p>

              <div className="input-group" style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "15px", 
                backgroundColor: "#1e1e24", 
                padding: "20px", 
                borderRadius: "15px",
                maxWidth: "500px",
                margin: "0 auto 30px auto" 
              }}>
                
                {/* 1. Typ-Auswahl (Obere Reihe) */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setHabitType("abstinenz")}
                    style={{
                      flex: 1, padding: "12px", borderRadius: "12px",
                      border: habitType === "abstinenz" ? "2px solid #007bff" : "1px solid #444",
                      backgroundColor: habitType === "abstinenz" ? "rgba(0, 123, 255, 0.15)" : "transparent",
                      color: habitType === "abstinenz" ? "#fff" : "#aaa",
                      cursor: "pointer", fontWeight: "bold", transition: "0.2s", fontSize: "0.9rem"
                    }}
                  >
                    ⏳ Abstinenz
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitType("wochenziel")}
                    style={{
                      flex: 1, padding: "12px", borderRadius: "12px",
                      border: habitType === "wochenziel" ? "2px solid #007bff" : "1px solid #444",
                      backgroundColor: habitType === "wochenziel" ? "rgba(0, 123, 255, 0.15)" : "transparent",
                      color: habitType === "wochenziel" ? "#fff" : "#aaa",
                      cursor: "pointer", fontWeight: "bold", transition: "0.2s", fontSize: "0.9rem"
                    }}
                  >
                    📅 Wochenziel
                  </button>
                </div>

                {/* 2. Haupt-Eingabefeld (Mittlere Reihe) */}
                <input
                  className="habit-input"
                  type="text"
                  placeholder="Was möchtest du tracken?"
                  value={eingabeWert}
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{ width: "100%", margin: 0 }}
                />

                {/* 3. Ziel-Wert & Emoji-Picker (Untere Reihe) */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    {habitType === "abstinenz" ? (
                      <input
                        className="goal-input"
                        type="number"
                        value={zielWert}
                        onChange={(e) => setZielWert(e.target.value)}
                        placeholder="Ziel in Tagen"
                        style={{ width: "100%", margin: 0 }}
                      />
                    ) : (
                      <input
                        className="goal-input"
                        type="number"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        placeholder="Wie oft/Woche?"
                        style={{ width: "100%", margin: 0 }}
                      />
                    )}
                  </div>

                  <div className="emoji-section" style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="emoji-trigger-btn"
                      onClick={() => setZeigePicker(!zeigePicker)}
                      style={{ height: "45px", width: "45px", display: "flex", alignItems: "center", justifyContent: "center", margin: 0 }}
                    >
                      {icon}
                    </button>

                    {zeigePicker && (
                      <>
                        <div className="emoji-overlay" onClick={() => setZeigePicker(false)} />
                        <div className="emoji-picker-container" style={{ position: "absolute", bottom: "55px", right: 0 }}>
                          <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 4. Hinzufügen Button (Ganz unten, volle Breite) */}
                <button 
                  onClick={habbithinzufuegen} 
                  className="add-button" 
                  style={{ width: "100%", marginTop: "5px", padding: "14px" }}
                >
                  Habit starten
                </button>
              </div>

              <ul className="habit-list" style={{ listStyle: "none", padding: 0, margin: "0 auto", maxWidth: "500px" }}>
                {habits.map((habit, index) => {
                  const isWochenziel = habit.type === "wochenziel";
                  const zielGroeße = isWochenziel ? habit.frequency : habit.goal;
                  const istErledigt = habit.days >= zielGroeße && zielGroeße > 0;
                  
                  return (
                    <li
  key={habit.id || index}
  className="habit-row fade-in-view"
  style={{
    display: "flex",
    alignItems: "center",
    backgroundColor: "#1e1e24",
    marginBottom: "12px",
    padding: "12px 15px", // Etwas weniger Padding für mehr Platz
    borderRadius: "16px",
    gap: "10px", // Kleinerer Gap zwischen den Blöcken
    borderLeft: istErledigt ? "4px solid #28a745" : "4px solid #007bff",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    width: "100%", // Sicherstellen, dass es nicht breiter als der Screen wird
    boxSizing: "border-box"
  }}
>
  {/* 1. Icon (Links) */}
  <div style={{ fontSize: "1.6rem", minWidth: "35px", textAlign: "center" }}>
    {habit.icon || "🔥"}
  </div>
  
  {/* 2. Text (Mitte) - flex: 1 sorgt dafür, dass dieser Teil schrumpft, falls nötig */}
  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
    <h3 style={{ 
      margin: 0, 
      fontSize: "1rem", 
      fontWeight: "600", 
      color: "#fff", 
      whiteSpace: "nowrap", 
      overflow: "hidden", 
      textOverflow: "ellipsis" // Macht "..." falls der Text zu lang ist
    }}>
      {habit.name}
    </h3>
    <span style={{ fontSize: "0.65rem", color: "#666", textTransform: "uppercase", display: "block" }}>
      {isWochenziel ? "Wochenziel" : "Abstinenz"}
    </span>
  </div>

  {/* 3. Zähler & Buttons (Rechts) - Alles kompakt zusammengefasst */}
  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
    
    {/* Zähler */}
    <div style={{ textAlign: "right", minWidth: "35px" }}>
      <span style={{ fontSize: "1rem", fontWeight: "700", color: istErledigt ? "#28a745" : "#fff" }}>
        {habit.days}
      </span>
      {isWochenziel && (
        <span style={{ fontSize: "0.7rem", color: "#444" }}>/{habit.frequency}</span>
      )}
    </div>
    
    {/* Deine neuen Buttons */}
    <div className="habit-row-actions" style={{ display: "flex", gap: "6px" }}>
      <button
        onClick={() => tagHinzufuegen(habit.id, index)}
        disabled={isWochenziel && istErledigt}
        className="btn-plus"
        style={{ width: "36px", height: "36px", fontSize: "1.2rem" }} // Etwas kompakter
      >
        +
      </button>
      
      <button onClick={() => habitReset(habit.id, index)} className="btn-reset" style={{ width: "32px", height: "32px" }}>
        🔄
      </button>
      
      <button onClick={() => habitLoeschen(habit.id, index)} className="btn-delete" style={{ width: "32px", height: "32px" }}>
        🗑️
      </button>
    </div>
  </div>
</li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* --- 2. ANSICHT: STATS VIEW --- */}
          {aktuelleAnsicht === "stats" && (
            <div className="stats-view fade-effekt" key="stats-view" style={{ textAlign: "center" }}>
              <h1 style={{ marginBottom: "10px" }}>Deine Erfolge 🏆</h1>
              <p className="quote" style={{ marginBottom: "30px" }}>Jeder Tag zählt auf deinem Weg.</p>
              
              {/* Haupt-Statistik Karte */}
              <div className="stats-card" style={{ 
                backgroundColor: "#1e1e24", 
                padding: "30px", 
                borderRadius: "20px", 
                maxWidth: "500px", 
                margin: "0 auto 40px auto",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                border: "1px solid #333"
              }}>
                <p style={{ color: "#888", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px", marginBottom: "10px" }}>
                  Insgesamt geschaffte Zeit
                </p>
                <h2 style={{ fontSize: "2rem", color: "#fff", margin: 0 }}>
                  {berechnenWochen(habits.reduce((sum, h) => sum + h.days, 0))}
                </h2>
              </div>

              {/* Developer Sektion - Jetzt schicker und passend zum Header/Profil */}
              <div className="dangercard stats-view fade-effekt" style={{ 
                maxWidth: "500px", 
                margin: "0 auto", 
                padding: "20px", 
                borderRadius: "15px", 
                backgroundColor: "rgba(220, 53, 69, 0.05)",
                border: "1px solid rgba(220, 53, 69, 0.2)"
              }}>
                <h3 style={{ color: "#dc3545", fontSize: "1.1rem", marginBottom: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                  ⚠️ Developer Optionen
                </h3>
                <button 
                  onClick={datenbankLeeren} 
                  className="btn-delete" 
                  style={{ 
                    width: "100%", 
                    height: "45px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: "10px",
                    fontSize: "0.95rem"
                  }}
                >
                  🔥 Gesamte Datenbank leeren
                </button>
              </div>
            </div>
          )}
          
          {/* --- 3. ANSICHT: PROFILE VIEW --- */}
          {aktuelleAnsicht === "profile" && (
            <div className="profile-view fade-effekt" key="profile-view">
              <h1>Dein Account ⚙️</h1>
              <p className="quote">Verwalte deine persönlichen Einstellungen.</p>
              
              <div className="profile-card">
                <p className="profile-email-info">
                  Angemeldet als: <br/>
                  <strong>{user.email}</strong>
                </p>
                
                {/* Name ändern Sektion */}
                <div className="profile-section">
                  <h3>Name ändern</h3>
                  <div className="form-group">
                    <input
                      className="habit-input"
                      type="text"
                      placeholder={`Aktuell: ${user.user_metadata.display_name}`}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <button onClick={updateName} className="add-button">Namen speichern</button>
                  </div>
                </div>

                {/* Passwort ändern Sektion */}
                <div className="profile-section">
                  <h3>Passwort ändern</h3>
                  <div className="form-group">
                    <input
                      className="habit-input"
                      type="password"
                      placeholder="Neues Passwort"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button onClick={updatePassword} className="add-button">Passwort aktualisieren</button>
                  </div>
                </div>
                
                {/* Passwort-Regeln */}
                {newPassword.length > 0 && (
                  <div className="password-hints fade-effekt">
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