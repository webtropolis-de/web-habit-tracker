import { useState, useEffect, useRef } from "react";
import "./App.css"; // Stylesheet importieren
import logo from "./assets/logo.png"; // Logo importieren
import EmojiPicker from "emoji-picker-react"; // Emoji Picker
import { supabase } from "./supabaseClient";
import { berechnenWochen, holeZufallsSpruch, validatePassword, istNeueWoche } from "./helper";
import { habitService } from "./habitService"; // Supabase Services
import confetti from "canvas-confetti";


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
  const emojiOptionen = ["🔥", "💪", "🥗", "💧", "🧘", "📚", "🚭", "🍺", "🛌", "🏃", "🎯", "💰","♥️", "🎮", "💵"];
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const aktuellesdatum = new Date().toLocaleDateString('de-DE', {weekday: "long", day:"numeric", month: "long", year: "numeric"});
  const [toast, setToast] = useState(null);
  const [offenerKalender, setOffenerKalender] = useState(null); // Speichert  ID des Habits
  const [erinnerungZeit, setErinnerungZeit] = useState(localStorage.getItem("reminder_time") || "09:00");
  const speichereZeit = (neueZeit) => {setErinnerungZeit(neueZeit);localStorage.setItem("reminder_time", neueZeit);toast.success(`Wecker auf ${neueZeit} Uhr gestellt! ⏰`);};
  const [kiMotivation, setKiMotivation] = useState("");
  const [isKiLoading, setIsKiLoading] = useState(false);


  // ----------------  Kalender Function -------------------------------  //

    const holeTageImMonat = () => {
    const jetzt = new Date();
    const jahr = jetzt.getFullYear();
    const monat = jetzt.getMonth();
    const ersterTagWochentag = new Date(jahr, monat, 1).getDay();
    const leertageAmAnfang = (ersterTagWochentag + 6) % 7;
    const anzahlTage = new Date(jahr, monat + 1, 0).getDate();
    const tageArray = [];
    
    // Leertage  
    for (let i = 0; i < leertageAmAnfang; i++) {
      tageArray.push({ leertag: true });
    }
    
    // Echte Tage 
    for (let tag = 1; tag <= anzahlTage; tag++) {
      const datum = new Date(jahr, monat, tag).toLocaleDateString('de-DE', {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
      });
      tageArray.push({ tag, datum, leertag: false });
    }
    
    return tageArray;
  };

  // -------------- Toast Funktion ------------------------------------- //
  const zeigeToast = (nachricht) => {
    setToast(nachricht);
    setTimeout(() => {
      setToast(null);
    }, 3000); 
  };
  
  // ------------------- PWA POPup -------------------------------------- //
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // Prüft, ob die App schon im Vollbild/Standalone-Modus läuft
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isIOS && !isStandalone) {
      setShowInstallPrompt(true);
    }
  }, []);

  useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js') 
      .then(() => console.log('SW registriert'))
      .catch(err => console.log('SW Fehler:', err));
  }
}, []);
// -------------------------- Zeitplaner ------------------------------ //
useEffect(() => {
  const planeBenutzerErinnerung = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || Notification.permission !== "granted") return;

    const [stunden, minuten] = erinnerungZeit.split(':');
    const jetzt = new Date();
    const ziel = new Date();
    
    ziel.setHours(parseInt(stunden), parseInt(minuten), 0, 0);

    
    if (ziel <= jetzt) {
      ziel.setDate(jetzt.getDate() + 1);
    }

    const differenz = ziel.getTime() - jetzt.getTime();

    // Timer setzen
    setTimeout(() => {
      reg.showNotification("Daily Check-In 🎯", {
        body: "Dein Versprechen für heute wartet. Kurz einchecken?",
        tag: "daily-reminder",
        icon: "/logo192.png",
        renotify: true
      });
    }, differenz);
  };

  window.addEventListener('beforeunload', planeBenutzerErinnerung);
  return () => window.removeEventListener('beforeunload', planeBenutzerErinnerung);
}, [erinnerungZeit]); 

  // ------------------------ Notifications --------------------------------//

  const aktiviereErinnerung = async () => {
  if (!("Notification" in window)) {
    zeigeToast("Browser unterstützt keine Mitteilungen", "error");
    return;
  }

  const erlaubnis = await Notification.requestPermission();
  if (erlaubnis === "granted") {
    zeigeToast("Erinnerungen aktiviert! 🔔");
    new Notification("Check-In bereit", {
      body: "Deine Habits warten auf dich!",
      icon: "/logo.png" 
    });
  } else {
    zeigeToast("Mitteilungen wurden blockiert.", "error");
  }
};

const aktiviereNotifications = async () => {
  if (!("Notification" in window)) {
    alert("Benachrichtigungen werden nicht unterstützt.");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      reg.showNotification("Aktiviert! 🔔", {
        body: "Du wirst ab jetzt an deinen Check-In erinnert.",
        icon: "/logo192.png"
      });
    }
  }
};

  // ---------------------------- KI Coach ------------------------------------- //

const holeKIMotivation = async () => {
  if (!habits || habits.length === 0) {
    zeigeToast("Erstelle erst ein Habit für den Coach!", "error");
    return;
  }

  setIsKiLoading(true);
  setKiMotivation(""); 
  
  // Gemini KEy aus Env
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
  // gemini-2.5-flash
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

  try {
    const habitZusammenfassung = habits.map(h => `${h.name}: ${h.days} Tage`).join(", ");

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Du bist ein motivierender Coach. Analysiere diese Habits: ${habitZusammenfassung}. Schreib einen extrem kurzen, kraftvollen Coaching-Spruch auf Deutsch (max 2 Sätze) und sprich den Nutzer direkt mit Namen (${user.user_metadata.display_name} an) an`
          }]
        }]
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0].content.parts[0].text) {
      setKiMotivation(data.candidates[0].content.parts[0].text);
    } else {
      console.error("API Error Details:", data);
      throw new Error("Ungültige Antwort von Google erhalten.");
    }
  } catch (err) {
    console.error("Netzwerkfehler:", err);
    zeigeToast("KI-Coach hat gerade Funkstille. 🤖", "error");
  } finally {
    setIsKiLoading(false);
  }
};

  // --------------------------- Habbit hinzufügen ---------------------------------//
  const habbithinzufuegen = async () => {
    if (eingabeWert.trim() === "") {
      zeigeToast("Bitte gib einen Namen für das Habit ein!", "error");
      return; 
    }

    setLoadingText("Speichere dein neues Habit...");
    setLoading(true);

    const neuesHabit = {
      name: eingabeWert,
      days: 0,
      icon: icon,
      goal: zielWert === "" ? 0 : Number(zielWert),
      type: habitType,                   
      frequency: Number(frequency) || 0,
    };

    // die Daten (inkl. ID) zurückbekommen 
    const { data, error } = await habitService.habbithinzufuegen(neuesHabit); 

    if (!error && data) {
      setHabits([...habits, data[0]]);
      setInputValue("");
      setZielWert("");
      setFrequency("");
    } else {
      console.error("Supabase Error:", error);
      zeigeToast("Fehler beim Speichern in der Cloud!");
    }
    setLoading(false);
  };

  // Habbit löschen mit confirm
  const habitLoeschen = async (id, index) => {
    // Bestätigungs-Dialog abfragen
    if (!window.confirm("Möchtest du diesen Habit wirklich löschen?")) {
      return; 
    }

    setLoading(true); // Spinner erst starten, wenn der User bestätigt hat
    try {
      const { error } = await supabase
        .from("habits")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Lokal entfernen
      const neueHabits = habits.filter((_, i) => i !== index);
      setHabits(neueHabits);
    } catch (error) {
      console.error("Fehler beim Löschen:", error.message);
      zeigeToast("Fehler beim Löschen des Habits.");
    } finally {
      setLoading(false); 
      // Spinner stoppen
    }
  };

 // ---------------------+1 Funktion-------------------------------------//
  const tagHinzufuegen = async (idVonDatenbank, indexInListe) => {
    const aktuellesHabit = habits[indexInListe];
    
    //  Datum 
    const heuteString = new Date().toLocaleDateString('de-DE', {
      weekday: "long", day:"numeric", month: "long", year: "numeric"
    });

    //  Ziel-Größe 
    const isWochenziel = aktuellesHabit.type === "wochenziel";
    const zielGroeße = isWochenziel ? aktuellesHabit.frequency : aktuellesHabit.goal;

    // Sperre für Wochenziele
    if (isWochenziel && aktuellesHabit.days >= zielGroeße) {
      zeigeToast("Du hast dein Wochenziel für diese Woche schon erreicht! 🎉");
      return;
    }

    // Sperre für tägliche Abstinenz 
    if (!isWochenziel && aktuellesHabit.last_clicked === heuteString) {
      zeigeToast("Stark geblieben! Du hast für heute schon einen Tag eingetragen. Mach morgen weiter! 💪");
      return;
    }

    const neuerWert = aktuellesHabit.days + 1;
    
    // Rekord prüfen
    let neuerRekord = aktuellesHabit.best_streak || 0;
    if (neuerWert > neuerRekord) {
      neuerRekord = neuerWert;
    }

    const alteHistory = aktuellesHabit.history || [];
    const neueHistory = [...alteHistory, heuteString];

    // DB-Update an Supabase senden
    const { error } = await supabase
      .from("habits")
      .update({ 
        days: neuerWert, 
        best_streak: neuerRekord,
        last_clicked: heuteString,
        history: neueHistory //
      })
      .eq("id", idVonDatenbank);

    if (!error) {
      // Konfetti
      if (neuerWert === zielGroeße && zielGroeße > 0) {
        confetti({
          particleCount: 150, spread: 70, origin: { y: 0.6 },
          colors: ['#007bff', '#28a745', '#ffffff']
        });
      }

      // Anzeige auf dem Bildschirm aktualisieren
      const neueListe = [...habits];
      neueListe[indexInListe].days = neuerWert;
      neueListe[indexInListe].best_streak = neuerRekord;
      neueListe[indexInListe].last_clicked = heuteString;
      neueListe[indexInListe].history = neueHistory; // Lokal aktualisieren
      setHabits(neueListe);
    } else {
      console.error("Datenbank-Fehler:", error);
      zeigeToast("⚠️ Fehler! DB Error: " + error.message);
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
      zeigeToast("Fehler beim Ändern des Namens: " + error.message);
    } else {
      zeigeToast("Name erfolgreich geändert!");
      setUser(data.user); 
      setNewName("");
    }
    setLoading(false);
  };

  const updatePassword = async () => {
    if (!validatePassword(newPassword).length || !validatePassword(newPassword).hasNumber) {
      zeigeToast("Passwort erfüllt nicht die Kriterien.");
      return;
    }
    setLoadingText("Aktualisiere Passwort...");
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      zeigeToast("Fehler beim Ändern des Passworts: " + error.message);
    } else {
      zeigeToast("Passwort erfolgreich geändert!");
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
    if (error) zeigeToast("Registrierung fehlgeschlagen: " + error.message);
    else zeigeToast("Check deine E-Mails für den Bestätigungslink!");
  };

  const handleLogin = async () => {
    setLoadingText("Melde dich an...");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) zeigeToast("Login fehlgeschlagen: " + error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoadingText("Melde dich ab...");
    setLoading(true);
    await supabase.auth.signOut();
    setHabits([]); // Liste leeren
    setKiMotivation(""); // KI Text leeren
    clearLogin(); // Formularfelder leeren
    setAktuelleAnsicht("home"); // Zurück auf Start 
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
        // Prüfen, ob wir Wochenziele auf 0 setzen müssen 
        let aktuelleHabits = [...data];

        for (let i = 0; i < aktuelleHabits.length; i++) {
          const habit = aktuelleHabits[i];

          
          if (habit.type === "wochenziel" && istNeueWoche(habit.last_reset)) {
            // auf 0 setzen
            await habitService.wochenReset(habit.id);
            // auf 0 setzen
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
    
    const { error } = await habitService.tageUpdaten(idVonDatenbank, 0);

    if (!error) {
      // Anzeige  aktualisieren
      const neueListe = [...habits];
      neueListe[indexInListe].days = 0;
      setHabits(neueListe);
    }else {
        console.error("Fehler beim Leeren:", error.message);
        zeigeToast("Fehler: " + error.message);
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
      
      const { error } = await habitService.datenbankLeeren();

      if (!error) {
        setHabits([]); //
        zeigeToast("Datenbank wurde komplett geleert!");
      } else {
        console.error("Fehler beim Leeren:", error.message);
        zeigeToast("Fehler: " + error.message);
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

  // -------------------------Ende Functions--------------------------------------------------------------

  // Begin -> HTML

  return (
    <div className="App">
      
      {loading ? (
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
         
          <img className="logo" src={logo} alt="Logo" style={{ width: "150px", marginBottom: "10px" }} />
          <h1>{isLoginMode ? "Willkommen zurück!" : "Konto erstellen"}</h1>
          
          <div className="input-group login-form" style={{ marginTop: "20px" }}>
            <p className="quote">
              {isLoginMode 
                ? "Melde dich an, um deine Habits zu tracken." 
                : "Registriere dich und starte deine Reise."}
            </p>
            
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
            
            {/* Burger Menü  */}
            <button
              onClick={() => setIsMenuOpen(true)}
              style={{ background: "none", border: "none", fontSize: "28px", color: "white", cursor: "pointer", padding: 0, width: "40px", textAlign: "left" }}
            >
              ☰
            </button>

            {/* Überschrift */}
            <h2 style={{ 
              margin: 0, 
              fontSize: "1.2rem", 
              color: "#fff", 
              textAlign: "center", 
              flexGrow: 1,
              fontWeight: "600"
            }}>
              {aktuelleAnsicht === "home" ? "Today" : aktuelleAnsicht === "stats" ? "Statistik" : "Profil"} <p style={{ color: "#888", fontSize: "0.9rem" }}>
                  Heute ist {aktuellesdatum}
                </p>
            </h2>
            {/* Logo  */}
            <div style={{ width: "50px", display: "flex", justifyContent: "flex-end" }}>
              <img
                src={logo}
                alt="Logo"
                style={{ height: "50px", width: "auto" }}
              />
            </div>
          </header>

          {/* SIDEBAR-MENÜ */}
          <>
            <div
              className={`sidebar-overlay ${isMenuOpen ? 'open' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            ></div>

            <div className={`sidebar-menu ${isMenuOpen ? 'open' : ''}`}>
              <h2 className="sidebar-header">Menü</h2>
              
              <button
                onClick={() => { setAktuelleAnsicht("home"); setIsMenuOpen(false); }}
                className={`sidebar-link ${aktuelleAnsicht === "home" ? "active" : ""}`}
              >
                🏠 Tracker
              </button>
              <button
                onClick={() => { setAktuelleAnsicht("stats"); setIsMenuOpen(false); }}
                className={`sidebar-link ${aktuelleAnsicht === "stats" ? "active" : ""}`}
              >
                📊 Statistik
              </button>
              <button
                onClick={() => { setAktuelleAnsicht("profile"); setIsMenuOpen(false); }}
                className={`sidebar-link ${aktuelleAnsicht === "profile" ? "active" : ""}`}
              >
                👤 Profil
              </button>

              <div style={{ flexGrow: 1 }}></div> {/* Platzhalter */}

              <button
                onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                className="sidebar-link logout"
              >
                🚪 Logout
              </button>
            </div>
          </>

          {/* TRACKER HOME VIEW  */}
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
                
                {/* Typ-Auswahl  */}
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

                {/* Haupt-Eingabefeld */}
                <input
                  className="habit-input"
                  type="text"
                  placeholder="Was möchtest du tracken?"
                  value={eingabeWert}
                  required
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{ width: "100%", margin: 0 }}
                />

                {/* Ziel-Wert & Emoji-Picker */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    {habitType === "abstinenz" ? (
                  <input
                    className="goal-input"
                    type="number"
                    value={zielWert}
                    onChange={(e) => setZielWert(e.target.value)}
                    placeholder="Wie lange? (leer = ♾️)" 
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

                  <div className="emoji-dropdown-container">
                    {/* Button zum Öffnen */}
                    <button 
                      type="button" 
                      className={`emoji-selector-btn ${zeigePicker ? 'active' : ''}`}
                      onClick={() => setZeigePicker(!zeigePicker)}
                    >
                      <span className="emoji-label"></span>
                      <span className="selected-emoji">{icon}</span>
                      
                    </button>

                    {/* aufklappbare Menü */}
                    {zeigePicker && (
                      <div className="emoji-picker-dropdown fade-effekt">
                        <div className="emoji-grid">
                          {emojiOptionen.map((e) => (
                            <button
                              key={e}
                              type="button"
                              className={`emoji-option ${icon === e ? "is-selected" : ""}`}
                              onClick={() => {
                                setIcon(e);
                                setZeigePicker(false); // Schließt das Menü 
                              }}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hinzufügen Button  */}
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
                padding: "12px 15px", 
                borderRadius: "16px",
                gap: "10px", 
                borderLeft: istErledigt ? "4px solid #28a745" : "4px solid #007bff",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                width: "100%", 
                boxSizing: "border-box"
              }}
            >
              {/* Icons  */}
              <div style={{ fontSize: "1.6rem", minWidth: "35px", textAlign: "center" }}>
                {habit.icon || "🔥"}
              </div>
              
              {/* Text  */}
            <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {habit.name}
              </h3>
              <span style={{ fontSize: "0.65rem", color: "#666", textTransform: "uppercase", display: "block" }}>
                {isWochenziel ? "Wochenziel" : "Abstinenz"}
              </span>

              {/* Progress Bar  */}
              {zielGroeße > 0 && (
                <div className="habit-progress-container" style={{ marginTop: "8px" }}>
                  <div 
                    className={`habit-progress-bar ${istErledigt ? "completed" : ""}`}
                    style={{ width: `${Math.min((habit.days / zielGroeße) * 100, 100)}%` }}
                  ></div>
                </div>
              )}

  {/* KALENDER SEKTION  */}
<div className="calendar-section">
  <button 
    className="calendar-trigger"
    onClick={() => setOffenerKalender(habit)} 
    style={{ background: 'none', border: 'none', color: '#007bff', fontSize: '0.85rem', padding: '8px 0', cursor: 'pointer', textDecoration: 'underline' }}
  >
    📅 Kalender anzeigen
  </button>
</div>
</div>

  {/*  Zähler & Buttons (Rechts)  */}
  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
    
    {/* Zähler */}
    <div style={{ textAlign: "right", minWidth: "35px" }}>
      <span style={{ fontSize: "1rem", fontWeight: "700", color: istErledigt ? "#28a745" : "#fff" }}>
        {habit.days}
      </span>
      
      
      {zielGroeße > 0 && (
        <span style={{ fontSize: "0.7rem", color: "#444" }}>/{zielGroeße}</span>
      )}
    </div>
    
    {/*   Touch-Zonen */}
  <div className="habit-row-actions">
    <button
    onClick={() => tagHinzufuegen(habit.id, index)} 
    
    className="action-zone-main"
    title="Tag hinzufügen"
    style={{ 
      
      opacity: ((isWochenziel && istErledigt) || (!isWochenziel && habit.last_clicked === aktuellesdatum)) ? 0.3 : 1 
    }}
  >
    +
  </button>

    <div className="action-side-column">
    <button 
      onClick={() => habitReset(habit.id, index)} 
      className="action-zone-small reset"
    >
      🔄
    </button>
    <button 
      onClick={() => habitLoeschen(habit.id, index)} 
      className="action-zone-small delete"
    >
      🗑️
    </button>
  </div>
    
    
    
    
    </div>
  </div>
</li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* STATS VIEW */}
          {aktuelleAnsicht === "stats" && (
            <div className="stats-view fade-effekt" key="stats-view" style={{ textAlign: "center" }}>
              <h1 style={{ marginBottom: "10px" }}>Deine Erfolge 🏆</h1>
              <p className="quote" style={{ marginBottom: "30px" }}>Jeder Tag zählt auf deinem Weg.</p>
              
              {/* Haupt- Karte */}
              <div className="stats-card" style={{ 
              }}>
                <p style={{ color: "#888", textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "1px", marginBottom: "10px" }}>
                  Insgesamt geschaffte Zeit
                </p>
                <h2 style={{ fontSize: "1.4rem", color: "#fff", margin: 0 }}>
                  {berechnenWochen(habits.reduce((sum, h) => sum + h.days, 0))}
                </h2>
              </div>

              {/* KI-Coach Karte */}
              <div className="stats-card ki-card fade-effekt">
                <h2 className="ki-header">
                  KI Erfolgs-Coach 🤖
                </h2>
                
                {kiMotivation ? (
                  <p className="ki-text">
                    "{kiMotivation.replace(/\*\*/g, '')}"
                  </p>
                ) : (
                  <p className="ki-placeholder">
                    Lass die KI deine Streak analysieren.
                  </p>
                )}
                
                <button 
                  onClick={holeKIMotivation} 
                  className="ki-btn" 
                  disabled={isKiLoading}
                >
                  {isKiLoading ? "Analysiere..." : "Coach fragen"}
                </button>
              </div>

              <div className="stats-grid">
  {habits.map((habit) => (
    <div key={habit.id} className="stats-card">
      <div className="stats-header">
        <span className="stats-icon">{habit.icon}</span>
        <h4>{habit.name}</h4>
      </div>
      
      <div className="stats-body">
        <div className="stat-item">
          <span className="stat-label">Aktuell:</span>
          <span className="stat-value">{habit.days} Tage</span>
        </div>
        
        <div className="stat-item best-streak">
          <span className="stat-label">🏆 Rekord:</span>
          <span className="stat-value">{habit.best_streak || 0} Tage</span>
        </div>
      </div>
      
      {/* Fortschrittsbalken */}
      <div className="mini-progress-bg">
        <div 
          className="mini-progress-fill" 
          style={{ width: `${Math.min((habit.days / (habit.best_streak || 1)) * 100, 100)}%` }}
        ></div>
      </div>
    </div>
  ))}
</div>

              {/* Developer   */}
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
          
          {/*  PROFILE VIEW */}
          {aktuelleAnsicht === "profile" && (
            <div className="profile-view fade-effekt" key="profile-view">
              <h1>Dein Account ⚙️</h1>
              <p className="quote">Verwalte deine persönlichen Einstellungen.</p>
              <p className="profile-email-info">
                  Angemeldet als: <br/>
                  <strong>{user.email}</strong>
                </p>
                <button onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                style={{ background: "#af0000", border: "none", color: "#ffffff", textAlign: "center", fontSize: "1rem", cursor: "pointer", padding: "8px", borderTop: "0px solid #444" }}
              >
                Logout
              </button>
              <br></br>
              <div className="profile-card">
  <h3>Daily Reminder 🔔</h3>
  <p className="modal-subtitle" style={{textAlign: 'left', marginBottom: '15px'}}>
    Wann möchtest du an deinen Check-In erinnert werden?
  </p>
  
  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>
    <input 
      type="time" 
      value={erinnerungZeit}
      onChange={(e) => speichereZeit(e.target.value)}
      className="time-input"
    />
    <button onClick={aktiviereNotifications} className="btn-checkin" style={{marginTop: 0}}>
      Aktivieren
    </button>
  </div>
</div> <br></br>
              <div className="profile-card">
                <h3>Name ändern</h3>
                
                
                {/* Name ändern  */}
                <div className="profile-section">
                  
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
                </div>
                <br></br>
                
                <div className="profile-card">
                  <h3>Passwort ändern</h3>
                {/* Passwort ändern  */}
                <div className="profile-section">
                  
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
      {/* INSTALL POPUP  */}
      {showInstallPrompt && (
        <div className="ios-install-prompt fade-effekt">
          <button 
            className="close-prompt" 
            onClick={() => setShowInstallPrompt(false)}
          >
            ✕
          </button>
          <p>
            <strong>App installieren</strong><br/>
            Tippe unten auf das Teilen-Symbol <span style={{ fontSize: "1rem" }}>⏍</span> und wähle 
            <strong>" Zum Home-Bildschirm"</strong> <span style={{ fontSize: "1rem" }}>➕</span>
          </p>
          
        </div>
      )}
      {/*  TOASTs */}
      {toast && (
        <div className="custom-toast">
          {toast}
        </div>
      )}



      {/*  CALENDAR MODAL */}
{offenerKalender && (
  <div className="modal-overlay" onClick={() => setOffenerKalender(null)}>
    <div className="modal-content fade-effekt" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h2>{offenerKalender.icon} {offenerKalender.name}</h2>
        <button className="close-modal" onClick={() => setOffenerKalender(null)}>✕</button>
      </div>
      
      <p className="modal-subtitle">Deine Erfolge im aktuellen Monat</p>

      <div className="calendar-mini-grid">
        {['M', 'D', 'M', 'D', 'F', 'S', 'S'].map((day, i) => (
          <div key={i} className="calendar-weekday-label">{day}</div>
        ))}
        {holeTageImMonat().map((tagObj, i) => {
          //   Leertag? 
          if (tagObj.leertag) {
            return <div key={`empty-${i}`} className="calendar-day empty"></div>;
          }
          
          //  Normaler Tag
          const istErfolgreich = offenerKalender.history?.includes(tagObj.datum);
          const istHeuteMarkiert = tagObj.datum === aktuellesdatum;
          
          return (
            <div 
              key={`tag-${tagObj.tag}`} 
              className={`calendar-day ${istErfolgreich ? "success" : ""} ${istHeuteMarkiert ? "today" : ""}`}
            >
              {tagObj.tag}
            </div>
          );
        })}
      </div>
      
      <button className="modal-btn-close" onClick={() => setOffenerKalender(null)}>Fertig</button>
    </div>
  </div>
)}
    </div>
  );
}

export default App;