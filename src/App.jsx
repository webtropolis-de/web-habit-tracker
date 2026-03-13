import { useState, useEffect, useRef } from "react";
import "./App.css"; // Stylesheet importieren
import logo from "./assets/logo.png"; // Logo importieren
import EmojiPicker from "emoji-picker-react"; // Emoji Picker
import { supabase } from "./supabaseClient";
import {
  berechnenWochen,
  holeZufallsSpruch,
  validatePassword,
  istNeueWoche,
} from "./helper";
import { habitService } from "./habitService"; // Supabase Services
import confetti from "canvas-confetti";

// -Level Rechner ---------------------------------------------------------------
const berechneLevelInfo = (aktuelleXp) => {
  let level = 1;
  let xpForNext = 100; // Für Level 2 brauchst du 100 XP
  let xpBase = 0; // Startpunkt des aktuellen Levels

  // Solange du genug XP hast, um das nächste Level zu knacken
  while (aktuelleXp >= xpBase + xpForNext) {
    xpBase += xpForNext;
    level++;
    xpForNext = Math.floor(xpForNext * 1.5); // Jedes Level wird 50% schwerer!
  }

  const xpImAktuellenLevel = aktuelleXp - xpBase;
  const progressProzent = Math.min((xpImAktuellenLevel / xpForNext) * 100, 100);

  return {
    level,
    xpImAktuellenLevel,
    xpForNext,
    progressProzent,
  };
};
// ----------------------------Avatar section-----------------------------------------------

const getAvatarUrl = (seed) => {
  const finalSeed = seed || "MaleHelmetWarrior16";
  return `avatars/${finalSeed}.png`;
};

// ---------------------------------------------------------------------------

function App() {
  const [tippModalOffen, setTippModalOffen] = useState(null); // Speichert das Habit, für das Tipps geladen werden
  const [habitTipps, setHabitTipps] = useState("");
  const [isTippLoading, setIsTippLoading] = useState(false);
  const [xp, setXp] = useState(0);
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
  const emojiOptionen = [
    "🔥",
    "💪",
    "🥗",
    "💧",
    "🧘",
    "📚",
    "🚭",
    "🍺",
    "🛌",
    "🏃",
    "🎯",
    "💰",
    "♥️",
    "🎮",
    "💵",
  ];
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const aktuellesdatum = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const levelInfo = berechneLevelInfo(xp);
  const [toast, setToast] = useState(null);
  const [offenerKalender, setOffenerKalender] = useState(null); // Speichert  ID des Habits
  const [erinnerungZeit, setErinnerungZeit] = useState(
    localStorage.getItem("reminder_time") || "09:00",
  );
  const speichereZeit = (neueZeit) => {
    setErinnerungZeit(neueZeit);
    localStorage.setItem("reminder_time", neueZeit);
    zeigeToast(`Wecker auf ${neueZeit} Uhr gestellt! ⏰`);
  };
  const [isKiLoading, setIsKiLoading] = useState(false);
  const [isKiModalOpen, setIsKiModalOpen] = useState(false); // Floating AI Coach
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("gemini_api_key") || "",
  );
  const [kiMotivation, setKiMotivation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState("MaleHelmetWarrior16");
  const [galerieOffen, setGalerieOffen] = useState(false);

  // ---------------------------- KI Habit Tipps --------------------------------- //
  const holeHabitTipps = async (habit) => {
    if (!apiKey) {
      zeigeToast("⚠️ Bitte trage zuerst deinen API-Key im Profil ein!");
      setAktuelleAnsicht("profile");
      return;
    }

    setTippModalOffen(habit); // Öffnet sofort das Modal für dieses Habit
    setIsTippLoading(true);
    setHabitTipps("");

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      // Der Prompt passt sich dynamisch an, ob es Abstinenz oder ein Wochenziel ist
      const zielTyp =
        habit.type === "wochenziel"
          ? "Ich möchte das regelmäßig schaffen."
          : "Ich möchte komplett darauf verzichten / abstinent bleiben.";

      const prompt = `Du bist ein Habit-Coach. Mein Ziel heißt: "${habit.name}". ${zielTyp} 
      Gib mir exakt 3 extrem kurze, psychologisch fundierte und direkt anwendbare Tipps, wie ich das durchziehe. 
      Formatiere es als kurze Liste. Keine langen Einleitungen, komm direkt zur Sache!`;

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0].content.parts[0].text) {
        setHabitTipps(data.candidates[0].content.parts[0].text);
      } else {
        throw new Error("Ungültige Antwort von der KI.");
      }
    } catch (err) {
      console.error("KI Tipp Fehler:", err);
      setHabitTipps(
        "Die KI konnte gerade keine Tipps laden. Versuch es später nochmal!",
      );
    } finally {
      setIsTippLoading(false);
    }
  };

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
      const datum = new Date(jahr, monat, tag).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      tageArray.push({ tag, datum, leertag: false });
    }

    return tageArray;
  };

  // -------------- Toast Funktion ------------------------------------- //
  const zeigeToast = (nachricht, typ = "success") => {
    const toastId = Date.now();
    // Erstelle das Toast-Objekt mit Nachricht und Typ
    setToast({ id: toastId, text: nachricht, type: typ });

    // Nach 4 Sekunden automatisch ausblenden
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  // ------------------- PWA POPup -------------------------------------- //
  useEffect(() => {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // Prüft, ob die App schon im Vollbild/Standalone-Modus läuft
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isIOS && !isStandalone) {
      setShowInstallPrompt(true);
    }
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("SW registriert"))
        .catch((err) => console.log("SW Fehler:", err));
    }
  }, []);
  // -------------------------- Zeitplaner ------------------------------ //
  useEffect(() => {
    const planeBenutzerErinnerung = async () => {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg || Notification.permission !== "granted") return;

      const [stunden, minuten] = erinnerungZeit.split(":");
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
          renotify: true,
        });
      }, differenz);
    };

    window.addEventListener("beforeunload", planeBenutzerErinnerung);
    return () =>
      window.removeEventListener("beforeunload", planeBenutzerErinnerung);
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
        icon: "/logo.png",
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
          icon: "/logo192.png",
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

    // NEU: Wenn kein Key im Profil hinterlegt ist
    if (!apiKey) {
      zeigeToast("⚠️ Bitte trage zuerst deinen API-Key im Profil ein!");
      setIsKiModalOpen(false); // Schließt das Modal
      setAktuelleAnsicht("profile"); // Springt automatisch zum Profil
      return;
    }

    setIsKiLoading(true);
    setKiMotivation("");

    // Wir nutzen jetzt den Key aus dem State (der aus dem Profil kommt)
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
      const habitZusammenfassung = habits
        .map((h) => `${h.name}: ${h.days} Tage`)
        .join(", ");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Du bist ein motivierender Coach. Analysiere diese Habits: ${habitZusammenfassung}. Schreib einen extrem kurzen, kraftvollen Coaching-Spruch auf Deutsch (max 2 Sätze) und sprich den Nutzer direkt mit Namen (${user.user_metadata.display_name} an) an`,
                },
              ],
            },
          ],
        }),
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
    // Name ausgefüllt?
    if (eingabeWert.trim() === "") {
      zeigeToast("Bitte gib einen Namen für das Habit ein!", "error");
      return;
    }

    //  Wochenziel ausgefüllt und > 0?
    if (habitType === "wochenziel" && (!frequency || Number(frequency) <= 0)) {
      zeigeToast(
        "Bitte gib an, wie oft pro Woche du das Ziel erreichen willst!",
        "error",
      );
      return;
    }

    setLoadingText("Speichere dein neues Habit...");
    setLoading(true);

    const neuesHabit = {
      name: eingabeWert,
      days: 0,
      icon: icon,
      // Abstinenz Ziel leer (also 0 = unendlich)
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
      zeigeToast("Fehler beim Speichern in der Cloud!", "error");
    }
    setLoading(false);
  };

  // ---------------------+1 Funktion-------------------------------------//
  const tagHinzufuegen = async (idVonDatenbank, indexInListe) => {
    const aktuellesHabit = habits[indexInListe];

    //  Datum
    const heuteString = new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    //  Ziel-Größe
    const isWochenziel = aktuellesHabit.type === "wochenziel";
    const zielGroeße = isWochenziel
      ? aktuellesHabit.frequency
      : aktuellesHabit.goal;

    // Sperre für Wochenziele
    if (isWochenziel && aktuellesHabit.days >= zielGroeße) {
      zeigeToast("Du hast dein Wochenziel für diese Woche schon erreicht! 🎉");
      return;
    }

    // Sperre für tägliche Abstinenz
    if (!isWochenziel && aktuellesHabit.last_clicked === heuteString) {
      zeigeToast(
        "Stark geblieben! Du hast für heute schon einen Tag eingetragen. Mach morgen weiter! 💪",
      );
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
        history: neueHistory, //
      })
      .eq("id", idVonDatenbank);

    if (!error) {
      // --- NEU: MEILENSTEINE & LEVEL-UP ---
      let verdienteXp = 10;
      let bonusXp = 0;
      let milestoneText = "";

      if (isWochenziel) {
        if (neuerWert === zielGroeße) {
          verdienteXp = 50;
        }
      } else {
        // Abstinenz: Streak-Multiplikator
        if (neuerWert >= 30) {
          verdienteXp = 50;
        } else if (neuerWert >= 14) {
          verdienteXp = 30;
        } else if (neuerWert >= 7) {
          verdienteXp = 20;
        } else if (neuerWert >= 3) {
          verdienteXp = 15;
        }

        // Abstinenz: Die großen Meilenstein-Boni!
        if (neuerWert === 7) {
          bonusXp = 100;
          milestoneText = "1 Woche geschafft!";
        } else if (neuerWert === 14) {
          bonusXp = 250;
          milestoneText = "2 Wochen stark geblieben!";
        } else if (neuerWert === 30) {
          bonusXp = 1000;
          milestoneText = "1 MONAT! Wahnsinn!";
        } else if (neuerWert === 90) {
          bonusXp = 5000;
          milestoneText = "90 TAGE! Legende!";
        } else if (neuerWert === 365) {
          bonusXp = 20000;
          milestoneText = "1 JAHR! Unfassbar!";
        }
      }

      const gesamtXpDazu = verdienteXp + bonusXp;
      const neuesXp = xp + gesamtXpDazu;

      // 1. Wir checken, auf welchem Level du VOR dem Klick warst
      const altesLevel = berechneLevelInfo(xp).level;
      // 2. Wir checken, auf welchem Level du NACH dem Klick bist
      const neuesLevel = berechneLevelInfo(neuesXp).level;

      // --- TOASTS & KONFETTI LOGIK ---
      if (neuesLevel > altesLevel) {
        // LEVEL UP! Goldene Konfetti-Explosion
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#ffc107", "#ff9800", "#ffffff"],
          zIndex: 3000,
        });
        zeigeToast(`🎉 LEVEL UP! Du bist jetzt Level ${neuesLevel}! 🎉`);
      } else if (bonusXp > 0) {
        // Nur ein Meilenstein erreicht (aber kein Level Up)
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 3000,
        });
        zeigeToast(`🏆 ${milestoneText} +${gesamtXpDazu} XP!`);
      } else {
        // Normaler Klick
        if (isWochenziel && neuerWert === zielGroeße) {
          zeigeToast(`Wochenziel erreicht! +50 XP 🎯`);
        } else if (!isWochenziel && verdienteXp > 10) {
          zeigeToast(`🔥 Streak-Bonus! +${verdienteXp} XP`);
        } else {
          zeigeToast(`+10 XP gesammelt! ✨`);
        }
      }

      setXp(neuesXp);

      supabase.auth.updateUser({
        data: { xp: neuesXp },
      });
      // ------------------------------------
      // Konfetti
      if (neuerWert === zielGroeße && zielGroeße > 0) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#007bff", "#28a745", "#ffffff"],
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

  // --------------------------- Habit löschen ---------------------------------//
  const habitLoeschen = async (id, index) => {
    // Bestätigungs-Dialog abfragen
    if (!window.confirm("Möchtest du dieses Habit wirklich löschen?")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("habits").delete().eq("id", id);

      if (error) throw error;

      // Lokal entfernen
      const neueHabits = habits.filter((_, i) => i !== index);
      setHabits(neueHabits);
      zeigeToast("Habit erfolgreich gelöscht! 🗑️");
    } catch (error) {
      console.error("Fehler beim Löschen:", error.message);
      zeigeToast("Fehler beim Löschen des Habits.", "error");
    } finally {
      setLoading(false);
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
      data: { display_name: newName },
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
    if (
      !validatePassword(newPassword).length ||
      !validatePassword(newPassword).hasNumber
    ) {
      zeigeToast("Passwort erfüllt nicht die Kriterien.");
      return;
    }
    setLoadingText("Aktualisiere Passwort...");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
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
    setLoadingText("Heuere neuen Helden an...");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: username,
          avatar_seed: "MaleHelmetWarrior16", // Standard-Held für neue User
          xp: 0,
        },
      },
    });

    if (error) {
      // Prüfen, ob der Held bereits existiert
      if (
        error.message.includes("already registered") ||
        error.status === 400
      ) {
        zeigeToast(
          "Dieser Held ist bereits bekannt! Nutze den Login.",
          "error",
        );
      } else {
        zeigeToast("Registrierung fehlgeschlagen: " + error.message, "error");
      }
      setLoading(false);
    } else if (data?.user && data?.session) {
      // Sofort-Login Erfolg (wenn Confirm Email OFF ist)
      zeigeToast("Willkommen in der Gilde, " + username + "!", "success");
      // Der User wird durch den onAuthStateChange in Supabase automatisch gesetzt
    } else {
      // Falls Confirm Email doch noch AN ist
      zeigeToast("Check deine E-Mails für den Bestätigungslink!", "success");
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoadingText("Betrete die Taverne...");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      zeigeToast("Login fehlgeschlagen: " + error.message, "error");
      setLoading(false);
    } else {
      zeigeToast("Willkommen zurück!", "success");
    }
  };

  const handleLogout = async () => {
    setLoadingText("Verlasse die Gruppe...");
    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      zeigeToast("Logout fehlgeschlagen: " + error.message, "error");
    } else {
      setHabits([]);
      setKiMotivation("");
      clearLogin();
      setAktuelleAnsicht("home");
      zeigeToast("Sicher zurückgekehrt!", "success");
    }
    setLoading(false);
  };

  // ---------------------db anbindung---------------------------------------//

  // Automatischer Speichervorgang (useEffect)
  // Daten beim Start aus Supabase laden
  // 1. Session prüfen
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // --- NEU: Daten beim ersten Laden aus den Metadaten ziehen ---
      if (currentUser) {
        setAvatarSeed(
          currentUser.user_metadata?.avatar_seed || "MaleHelmetWarrior16",
        );
        setXp(currentUser.user_metadata?.xp || 0);
      }
      // -------------------------------------------------------------

      if (!session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Auch beim Auth-Wechsel (Login/Logout) Daten setzen ---
      if (currentUser) {
        setAvatarSeed(
          currentUser.user_metadata?.avatar_seed || "MaleHelmetWarrior16",
        );
        setXp(currentUser.user_metadata?.xp || 0);
      }
      // ---------------------------------------------------------------

      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --------------------- Daten laden -------------------------------------
  // --------------------- Daten laden (MIT RPG-DELAY) -------------------------------------
  useEffect(() => {
    if (user?.id) {
      setXp(user.user_metadata?.xp || 0);

      const datenLaden = async () => {
        setLoadingText("Initialisiere Quest...");
        setLoading(true);

        // 1. Die echten Daten aus Supabase holen
        const { data, error } = await habitService.datenLaden();

        if (error) {
          console.log("Fehler beim Laden:", error);
        } else if (data) {
          let aktuelleHabits = [...data];
          for (let i = 0; i < aktuelleHabits.length; i++) {
            const habit = aktuelleHabits[i];
            if (habit.type === "wochenziel" && istNeueWoche(habit.last_reset)) {
              await habitService.wochenReset(habit.id);
              aktuelleHabits[i].days = 0;
              aktuelleHabits[i].last_reset = new Date().toISOString();
            }
          }
          setHabits(aktuelleHabits);
        }

        // 2. DER DELAY: Wir warten hier 2 Sekunden (2000ms)
        // Das gibt deinem Ladebalken im CSS genug Zeit zum Füllen
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setLoading(false); // Erst jetzt blenden wir den Ladebildschirm aus
      };

      datenLaden();
    }
  }, [user?.id]);

  // ---------------------------- habitReset ----------------------- //
  const habitReset = async (idVonDatenbank, indexInListe) => {
    setLoading(true);
    const aktuellesHabit = habits[indexInListe];
    const resetconfirm = window.confirm(
      "Möchtest du den Zähler wirklich zurücksetzen? Das kostet dich 50 XP!",
    );

    if (resetconfirm === true) {
      const { error } = await habitService.tageUpdaten(idVonDatenbank, 0);

      if (!error) {
        // XP Strafe bei Reset ---
        let xpStrafe = 0;
        if (aktuellesHabit.days > 0) {
          // Ziehe 50 XP ab
          xpStrafe = Math.min(50, xp);
        }

        if (xpStrafe > 0) {
          const neuesXp = xp - xpStrafe;
          setXp(neuesXp);
          supabase.auth.updateUser({ data: { xp: neuesXp } });
          zeigeToast(`Streak gebrochen. -${xpStrafe} XP 📉`);
        } else {
          zeigeToast("Zähler auf 0 gesetzt.");
        }
        // --------------------------------

        // Anzeige aktualisieren
        const neueListe = [...habits];
        neueListe[indexInListe].days = 0;
        setHabits(neueListe);
      } else {
        console.error("Fehler beim Leeren:", error.message);
        zeigeToast("Fehler: " + error.message);
      }
    }
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
  };

  // -------------------------Ende Functions--------------------------------------------------------------

  if (loading) {
    return (
      <div className="spinner-container">
        {/* Das Logo über dem Balken */}
        <img
          src={logo}
          alt="Logo"
          style={{
            width: "120px",
            marginBottom: "10px",
            filter: "drop-shadow(0 0 10px rgba(0,0,0,0.5))",
          }}
        />

        {/* Der neue Ladebalken */}
        <div className="loading-bar-container">
          <div className="loading-bar-fill"></div>
        </div>

        <p
          className="fade-effekt"
          style={{ fontSize: "0.8rem", letterSpacing: "2px", opacity: 0.8 }}
        >
          {loadingText || "INITIALISIERE QUEST..."}
        </p>
      </div>
    );
  }

  // Begin -> HTML

  return (
    <div className="App">
      {loading ? (
        <div
          className="spinner-container"
          style={{
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
            zIndex: 2000,
          }}
        >
          <img
            className="logo"
            src={logo}
            alt="Logo"
            style={{ width: "150px", marginBottom: "30px" }}
          />
          <div className="spinner"></div>
          <p className="quote" style={{ marginTop: "20px" }}>
            Deine Erfolge werden geladen...
          </p>
        </div>
      ) : !user ? (
        <div className="login-view fade-effekt">
          <img
            className="logo"
            src={logo}
            alt="Logo"
            style={{ width: "150px", marginBottom: "10px" }}
          />
          <h1>{isLoginMode ? "Willkommen zurück!" : "Konto erstellen"}</h1>

          <form
            className="input-group login-form"
            style={{ marginTop: "20px" }}
            onSubmit={(e) => {
              e.preventDefault(); // Verhindert, dass der Browser die Seite neu lädt
              if (isLoginMode) {
                handleLogin();
              } else {
                if (
                  validatePassword(password).length &&
                  validatePassword(password).hasNumber
                ) {
                  handleRegister();
                } else {
                  zeigeToast("Passwort erfüllt nicht die Kriterien.", "error");
                }
              }
            }}
          >
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
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className="password-wrapper">
              <input
                className="habit-input"
                type={showPassword ? "text" : "password"}
                placeholder="Passwort"
                value={password}
                autoComplete={isLoginMode ? "current-password" : "new-password"}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  /* Durchgestrichenes Auge  */
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                ) : (
                  /* Passwort versteckt */
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </span>
            </div>

            {!isLoginMode && password.length > 0 && (
              <div className="password-hints fade-effekt">
                <p
                  className={
                    validatePassword(password).length ? "valid" : "invalid"
                  }
                >
                  <span>{validatePassword(password).length ? "✅" : "🔘"}</span>
                  Mind. 12 Zeichen
                </p>
                <p
                  className={
                    validatePassword(password).hasNumber ? "valid" : "invalid"
                  }
                >
                  <span>
                    {validatePassword(password).hasNumber ? "✅" : "🔘"}
                  </span>
                  Eine Zahl enthalten
                </p>
                <p
                  className={
                    validatePassword(password).hasSpecial ? "valid" : "invalid"
                  }
                >
                  <span>
                    {validatePassword(password).hasSpecial ? "✅" : "🔘"}
                  </span>
                  Ein Sonderzeichen
                </p>
              </div>
            )}

            <div className="login-button" style={{ marginTop: "10px" }}>
              {isLoginMode ? (
                <button type="submit" className="login-button">
                  Anmelden
                </button>
              ) : (
                <button
                  type="submit"
                  className="login-button"
                  disabled={
                    !validatePassword(password).length ||
                    !validatePassword(password).hasNumber
                  }
                  style={{
                    opacity:
                      !validatePassword(password).length ||
                      !validatePassword(password).hasNumber
                        ? 0.5
                        : 1,
                  }}
                >
                  Registrieren
                </button>
              )}
            </div>

            <div className="button-group" style={{ marginTop: "10px" }}>
              {isLoginMode ? (
                <p className="toggle-auth">
                  Noch kein Konto? <br></br>
                  <span
                    onClick={() => {
                      setIsLoginMode(false);
                      clearLogin();
                    }}
                  >
                    Jetzt registrieren
                  </span>
                </p>
              ) : (
                <p className="toggle-auth">
                  Bereits ein Konto? <br></br>
                  <span
                    onClick={() => {
                      setIsLoginMode(true);
                      clearLogin();
                    }}
                  >
                    Zum Login
                  </span>
                </p>
              )}
            </div>
          </form>
        </div>
      ) : (
        /* --- EINGELOGGT-BEREICH --- */
        <>
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 20px",
              borderBottom: "1px solid #333",
              backgroundColor: "#1e1e24",
              position: "sticky",
              top: 0,
              zIndex: 100,
            }}
          >
            {/* Burger Menü  */}
            <button
              onClick={() => setIsMenuOpen(true)}
              style={{
                background: "none",
                border: "none",
                fontSize: "28px",
                color: "white",
                cursor: "pointer",
                padding: 0,
                width: "40px",
                textAlign: "left",
              }}
            >
              ☰
            </button>

            {/* Überschrift */}
            <h2
              style={{
                margin: 0,
                fontSize: "1.2rem",
                color: "#fff",
                textAlign: "center",
                flexGrow: 1,
                fontWeight: "600",
              }}
            >
              {aktuelleAnsicht === "home"
                ? "Today"
                : aktuelleAnsicht === "stats"
                  ? "Statistik"
                  : "Profil"}{" "}
              <p style={{ color: "#888", fontSize: "0.9rem" }}>
                {aktuellesdatum}
              </p>
            </h2>
            {/* Profil-Icon oben rechts */}
            <div
              className="header-profile-zone"
              onClick={() => setAktuelleAnsicht("profile")}
              title="Zum Profil"
            >
              <div className="profile-avatar-circle">
                <img
                  src={getAvatarUrl(avatarSeed)}
                  alt="Avatar"
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%", // Rundet nur das Bild ab
                    objectFit: "cover",
                  }}
                />
                <span className="mini-level-indicator">{levelInfo.level}</span>
              </div>
            </div>
          </header>

          {/* SIDEBAR-MENÜ */}
          <>
            <div
              className={`sidebar-overlay ${isMenuOpen ? "open" : ""}`}
              onClick={() => setIsMenuOpen(false)}
            ></div>

            <div className={`sidebar-menu ${isMenuOpen ? "open" : ""}`}>
              <h2 className="sidebar-header">Menü</h2>
              <button
                onClick={() => {
                  setAktuelleAnsicht("home");
                  setIsMenuOpen(false);
                }}
                className={`sidebar-link ${aktuelleAnsicht === "home" ? "active" : ""}`}
              >
                🏠 Tracker
              </button>
              <button
                onClick={() => {
                  setAktuelleAnsicht("stats");
                  setIsMenuOpen(false);
                }}
                className={`sidebar-link ${aktuelleAnsicht === "stats" ? "active" : ""}`}
              >
                📊 Statistik
              </button>
              <button
                onClick={() => {
                  setAktuelleAnsicht("profile");
                  setIsMenuOpen(false);
                }}
                className={`sidebar-link ${aktuelleAnsicht === "profile" ? "active" : ""}`}
              >
                👤 Profil
              </button>
              <div style={{ flexGrow: 1 }}></div> {/* Platzhalter */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMenuOpen(false);
                }}
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

              {/* RPG DASHBOARD AUF DEM HOME SCREEN */}
              <div
                className="rpg-card dashboard-mini fade-effekt"
                style={{ margin: "20px auto", maxWidth: "500px" }}
              >
                <div className="rpg-card-header dashboard-header">
                  <div className="avatar-frame mini">
                    <img src={getAvatarUrl(avatarSeed)} alt="Held" />
                  </div>
                  <div className="char-info">
                    <h2
                      className="char-name mini"
                      style={{ textAlign: "left" }}
                    >
                      {user.user_metadata.display_name}
                    </h2>
                    <div className="char-rank mini">
                      {levelInfo.level >= 50
                        ? "🏆 Legende"
                        : levelInfo.level >= 20
                          ? "⚔️ Ritter"
                          : levelInfo.level >= 10
                            ? "🛡️ Krieger"
                            : "🪵 Novize"}
                    </div>
                  </div>
                  <div className="level-badge-compact">
                    Lvl {levelInfo.level}
                  </div>
                </div>

                <div className="xp-progress-section dashboard-xp">
                  <div className="xp-label-row">
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>
                      Erfahrung
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#888" }}>
                      {levelInfo.xpImAktuellenLevel} / {levelInfo.xpForNext} XP
                    </span>
                  </div>
                  <div className="xp-bar-bg">
                    <div
                      className="xp-bar-fill"
                      style={{ width: `${levelInfo.progressProzent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="xp-progress-section dashboard-xp"></div>

              <div
                className="input-group"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                  backgroundColor: "#1e1e24",
                  padding: "20px",
                  borderRadius: "15px",
                  maxWidth: "500px",
                  margin: "0 auto 30px auto",
                }}
              >
                {/* Typ-Auswahl  */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setHabitType("abstinenz")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      border:
                        habitType === "abstinenz"
                          ? "2px solid #007bff"
                          : "1px solid #444",
                      backgroundColor:
                        habitType === "abstinenz"
                          ? "rgba(0, 123, 255, 0.15)"
                          : "transparent",
                      color: habitType === "abstinenz" ? "#fff" : "#aaa",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "0.2s",
                      fontSize: "0.9rem",
                    }}
                  >
                    ⏳ Abstinenz
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitType("wochenziel")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      border:
                        habitType === "wochenziel"
                          ? "2px solid #007bff"
                          : "1px solid #444",
                      backgroundColor:
                        habitType === "wochenziel"
                          ? "rgba(0, 123, 255, 0.15)"
                          : "transparent",
                      color: habitType === "wochenziel" ? "#fff" : "#aaa",
                      cursor: "pointer",
                      fontWeight: "bold",
                      transition: "0.2s",
                      fontSize: "0.9rem",
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
                <div
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <div style={{ flex: 1 }}>
                    {habitType === "abstinenz" ? (
                      <input
                        className="goal-input"
                        type="number"
                        value={zielWert}
                        required
                        onChange={(e) => setZielWert(e.target.value)}
                        placeholder="Wie lange? (leer = ♾️)"
                        style={{ width: "100%", margin: 0 }}
                      />
                    ) : (
                      <input
                        className="goal-input"
                        type="number"
                        value={frequency}
                        required
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
                      className={`emoji-selector-btn ${zeigePicker ? "active" : ""}`}
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

              <ul className="habit-list">
                {habits.map((habit, index) => {
                  const isWochenziel = habit.type === "wochenziel";
                  const zielGroeße = isWochenziel
                    ? habit.frequency
                    : habit.goal;
                  const istErledigt =
                    habit.days >= zielGroeße && zielGroeße > 0;

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
                        borderLeft: istErledigt
                          ? "4px solid #28a745"
                          : "4px solid #007bff",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      {/* Icons  */}
                      <div
                        style={{
                          fontSize: "1.6rem",
                          minWidth: "35px",
                          textAlign: "center",
                        }}
                      >
                        {habit.icon || "🔥"}
                      </div>

                      {/* Text  */}
                      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            fontWeight: "600",
                            color: "#fff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {habit.name}
                        </h3>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            color: "#666",
                            textTransform: "uppercase",
                            display: "block",
                          }}
                        >
                          {isWochenziel ? "Wochenziel" : "Abstinenz"}
                        </span>

                        {/* Progress Bar  */}
                        {zielGroeße > 0 && (
                          <div
                            className="habit-progress-container"
                            style={{ marginTop: "8px" }}
                          >
                            <div
                              className={`habit-progress-bar ${istErledigt ? "completed" : ""}`}
                              style={{
                                width: `${Math.min((habit.days / zielGroeße) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                        )}

                        {/* KALENDER SEKTION  */}
                        <div className="calendar-section">
                          <button
                            className="calendar-trigger"
                            onClick={() => setOffenerKalender(habit)}
                          >
                            📅 Kalender
                          </button>

                          {apiKey && (
                            <button
                              className="calendar-trigger tipps-trigger"
                              onClick={() => holeHabitTipps(habit)}
                            >
                              💡 Tipps
                            </button>
                          )}
                        </div>
                      </div>

                      {/*  Zähler & Buttons (Rechts)  */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexShrink: 0,
                        }}
                      >
                        {/* Zähler */}
                        <div style={{ textAlign: "right", minWidth: "35px" }}>
                          <span
                            style={{
                              fontSize: "1rem",
                              fontWeight: "700",
                              color: istErledigt ? "#28a745" : "#fff",
                            }}
                          >
                            {habit.days}
                          </span>

                          {zielGroeße > 0 && (
                            <span style={{ fontSize: "0.7rem", color: "#444" }}>
                              /{zielGroeße}
                            </span>
                          )}
                        </div>

                        {/*   Touch-Zonen */}
                        <div className="habit-row-actions">
                          <button
                            onClick={() => tagHinzufuegen(habit.id, index)}
                            className="action-zone-main"
                            title="Tag hinzufügen"
                            style={{
                              opacity:
                                (isWochenziel && istErledigt) ||
                                (!isWochenziel &&
                                  habit.last_clicked === aktuellesdatum)
                                  ? 0.3
                                  : 1,
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
              {apiKey && (
                <button
                  className="fab-ki fade-effekt"
                  onClick={() => {
                    setIsKiModalOpen(true);
                    if (!kiMotivation && habits.length > 0 && !isKiLoading) {
                      holeKIMotivation();
                    }
                  }}
                  title="KI Coach fragen"
                >
                  🤖
                </button>
              )}
            </div>
          )}

          {/* STATS VIEW */}
          {aktuelleAnsicht === "stats" && (
            <div
              className="stats-view fade-effekt"
              key="stats-view"
              style={{ textAlign: "center" }}
            >
              <h1 style={{ marginBottom: "10px" }}>Deine Erfolge 🏆</h1>
              <p className="quote" style={{ marginBottom: "30px" }}>
                Jeder Tag zählt auf deinem Weg.
              </p>

              {/* Haupt- Karte */}
              <div className="stats-card" style={{}}>
                <div style={{ marginBottom: "15px" }}>
                  <span className="level-badge">
                    ⭐ Level {levelInfo.level}
                  </span>
                </div>
                <p
                  style={{
                    color: "#888",
                    textTransform: "uppercase",
                    fontSize: "0.8rem",
                    letterSpacing: "1px",
                    marginBottom: "10px",
                  }}
                >
                  Insgesamt geschaffte Zeit
                </p>
                <h2 style={{ fontSize: "1.4rem", color: "#fff", margin: 0 }}>
                  {berechnenWochen(habits.reduce((sum, h) => sum + h.days, 0))}
                </h2>
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
                        <span className="stat-value">
                          {habit.best_streak || 0} Tage
                        </span>
                      </div>
                    </div>

                    {/* Fortschrittsbalken */}
                    <div className="mini-progress-bg">
                      <div
                        className="mini-progress-fill"
                        style={{
                          width: `${Math.min((habit.days / (habit.best_streak || 1)) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Developer   */}
              <div
                className="dangercard stats-view fade-effekt"
                style={{
                  maxWidth: "500px",
                  margin: "0 auto",
                  padding: "20px",
                  borderRadius: "15px",
                  backgroundColor: "rgba(220, 53, 69, 0.05)",
                  border: "1px solid rgba(220, 53, 69, 0.2)",
                }}
              >
                <h3
                  style={{
                    color: "#dc3545",
                    fontSize: "1.1rem",
                    marginBottom: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
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
                    fontSize: "0.95rem",
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
              <p className="quote">
                Verwalte deine persönlichen Einstellungen.
              </p>
              <div className="rpg-card">
                <div className="rpg-card-header">
                  <div className="avatar-frame">
                    <img src={getAvatarUrl(avatarSeed)} alt="Held" />
                  </div>

                  <div className="char-info">
                    <h2 className="char-name">
                      {user.user_metadata.display_name}
                    </h2>

                    <div className="char-rank">
                      {levelInfo.level >= 50
                        ? "🏆 Legende"
                        : levelInfo.level >= 20
                          ? "⚔️ Ritter"
                          : levelInfo.level >= 10
                            ? "🛡️ Krieger"
                            : "🪵 Novize"}
                    </div>
                  </div>
                </div>
                {!galerieOffen ? (
                  /* ZUGEKLAPPT: Zeigt nur den Button zum Ändern */
                  <button
                    className="rpg-button-secondary"
                    onClick={() => setGalerieOffen(true)}
                    style={{ width: "100%", marginTop: "10px" }}
                  >
                    🛡️ Klasse wechseln
                  </button>
                ) : (
                  /* OFFEN: Die Galerie */
                  <div className="fade-effekt">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "15px",
                      }}
                    >
                      <h3 className="selection-title" style={{ margin: 0 }}>
                        Wähle deine Klasse
                      </h3>
                      <button
                        onClick={() => setGalerieOffen(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#888",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="avatar-grid">
                      {[
                        {
                          id: "MaleHelmetWarrior16",
                          label: "Ritter",
                          minLevel: 1,
                        },
                        {
                          id: "FemaleWarrior13",
                          label: "Kriegerin",
                          minLevel: 1,
                        },
                        { id: "FemaleRouge7", label: "Schurkin", minLevel: 5 },
                        {
                          id: "FemaleElves2",
                          label: "Waldläuferin",
                          minLevel: 5,
                        },
                        { id: "Werwolfs41", label: "Werwolf", minLevel: 10 },
                        { id: "Skeletons20", label: "Skelett", minLevel: 15 },
                      ].map((char) => {
                        const isLocked = levelInfo.level < char.minLevel;

                        return (
                          <div
                            key={char.id}
                            className={`avatar-card ${avatarSeed === char.id ? "active" : ""} ${isLocked ? "locked" : ""}`}
                            onClick={() => {
                              if (isLocked) {
                                zeigeToast(
                                  `🔒 Erst ab Level ${char.minLevel} verfügbar!`,
                                );
                                return;
                              }
                              setAvatarSeed(char.id);
                              supabase.auth.updateUser({
                                data: { avatar_seed: char.id },
                              });
                              zeigeToast(`${char.label} ausgewählt!`);
                              setGalerieOffen(false);
                            }}
                          >
                            <div className="avatar-preview-box">
                              <img
                                src={getAvatarUrl(char.id)} // Nutzt jetzt die korrigierte Funktion
                                alt={char.label}
                                style={{
                                  filter: isLocked
                                    ? "grayscale(1) brightness(0.4)"
                                    : "none",
                                  imageRendering: "pixelated",
                                  width: "100%", // Sicherstellen, dass es den Container füllt
                                  height: "100%",
                                  display: "block",
                                }}
                              />
                              {isLocked && <div className="lock-icon">🔒</div>}
                            </div>
                            <span className="avatar-label">
                              {isLocked ? `Lvl ${char.minLevel}` : char.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}{" "}
                <div className="rpg-stats-row">
                  <div className="stat-item">
                    <span className="stat-label">STUFE</span>
                    <span className="stat-value">{levelInfo.level}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">GESAMT XP</span>
                    <span className="stat-value">{xp}</span>
                  </div>
                </div>
              </div>
              <br></br>
              <div className="profile-card">
                <h3>Daily Reminder 🔔</h3>
                <p
                  className="modal-subtitle"
                  style={{ textAlign: "left", marginBottom: "15px" }}
                >
                  Wann möchtest du an deinen Check-In erinnert werden?
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    justifyContent: "left",
                  }}
                >
                  <input
                    type="time"
                    value={erinnerungZeit}
                    onChange={(e) => speichereZeit(e.target.value)}
                    className="time-input"
                  />
                  <button
                    onClick={aktiviereNotifications}
                    className="btn-checkin"
                    style={{ marginTop: 0 }}
                  >
                    Aktivieren
                  </button>
                </div>
              </div>{" "}
              <br></br>
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
                    <button onClick={updateName} className="add-button">
                      Namen speichern
                    </button>
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
                      autoComplete="new-password"
                      placeholder="Neues Passwort"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button onClick={updatePassword} className="add-button">
                      Passwort aktualisieren
                    </button>
                  </div>
                </div>
                {/* Passwort-Regeln */}
                {newPassword.length > 0 && (
                  <div className="password-hints fade-effekt">
                    <p
                      className={
                        validatePassword(newPassword).length
                          ? "valid"
                          : "invalid"
                      }
                    >
                      {validatePassword(newPassword).length ? "✔" : "✘"} Mind.
                      12 Zeichen
                    </p>
                    <p
                      className={
                        validatePassword(newPassword).hasNumber
                          ? "valid"
                          : "invalid"
                      }
                    >
                      {validatePassword(newPassword).hasNumber ? "✔" : "✘"} Eine
                      Zahl enthalten
                    </p>
                    <p
                      className={
                        validatePassword(newPassword).hasSpecial
                          ? "valid"
                          : "invalid"
                      }
                    >
                      {validatePassword(newPassword).hasSpecial ? "✔" : "✘"} Ein
                      Sonderzeichen
                    </p>
                  </div>
                )}
              </div>
              <p>
                <br></br>
              </p>
              <div className="profile-card">
                <h3>🤖 KI Coach aktivieren</h3>
                <p
                  className="modal-subtitle"
                  style={{ textAlign: "left", marginBottom: "15px" }}
                >
                  Trage hier deinen Google Gemini API-Key ein. Er wird nur lokal
                  und sicher auf deinem Gerät gespeichert. Du kannsr ihn dir
                  hier kostenfrei generieren{" "}
                  <a
                    href="https://aistudio.google.com/api-keys?"
                    target="blank"
                  >
                    API Key holen
                  </a>
                </p>
                <div className="form-group">
                  <input
                    className="habit-input"
                    type="text" /* WICHTIG: text statt password */
                    autoComplete="off"
                    data-1p-ignore="true" /* Ignoriert 1Password */
                    data-lpignore="true" /* Ignoriert LastPass */
                    data-form-type="other" /* Ignoriert Chrome Autofill */
                    placeholder="Dein API-Key (AIzaSy...)"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />

                  {/* NEU: Dieser Button verhindert das Ruckeln */}
                  <button
                    onClick={() => {
                      localStorage.setItem("gemini_api_key", apiKey);
                      zeigeToast("API-Key sicher gespeichert! 🤖");
                    }}
                    className="add-button"
                    style={{ marginTop: "10px" }}
                  >
                    Key speichern
                  </button>
                </div>
              </div>
              <br></br>
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
            <strong>App installieren</strong>
            <br />
            Tippe unten auf das Teilen-Symbol{" "}
            <span style={{ fontSize: "1rem" }}>⏍</span> und wähle
            <strong>" Zum Home-Bildschirm"</strong>{" "}
            <span style={{ fontSize: "1rem" }}>➕</span>
          </p>
        </div>
      )}
      {/*  TOASTs */}
      {toast && (
        <div className={`custom-toast ${toast.type} fade-effekt`}>
          {toast.type === "error" ? "⚠️ " : "📜 "}
          {toast.text}
        </div>
      )}

      {/*  CALENDAR MODAL */}
      {offenerKalender && (
        <div className="modal-overlay" onClick={() => setOffenerKalender(null)}>
          <div
            className="modal-content fade-effekt"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {offenerKalender.icon} {offenerKalender.name}
              </h2>
              <button
                className="close-modal"
                onClick={() => setOffenerKalender(null)}
              >
                ✕
              </button>
            </div>

            <p className="modal-subtitle">Deine Erfolge im aktuellen Monat</p>

            <div className="calendar-mini-grid">
              {["M", "D", "M", "D", "F", "S", "S"].map((day, i) => (
                <div key={i} className="calendar-weekday-label">
                  {day}
                </div>
              ))}
              {holeTageImMonat().map((tagObj, i) => {
                //   Leertag?
                if (tagObj.leertag) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="calendar-day empty"
                    ></div>
                  );
                }

                //  Normaler Tag
                const istErfolgreich = offenerKalender.history?.includes(
                  tagObj.datum,
                );
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

            <button
              className="modal-btn-close"
              onClick={() => setOffenerKalender(null)}
            >
              Fertig
            </button>
          </div>
        </div>
      )}

      {isKiModalOpen && (
        <div className="modal-overlay" onClick={() => setIsKiModalOpen(false)}>
          <div
            className="modal-content fade-effekt"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                🤖 KI Coach
              </h2>
              <button
                className="close-modal"
                onClick={() => setIsKiModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="ki-modal-body">
              {isKiLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "30px 0",
                  }}
                >
                  <div className="spinner"></div>
                  <p style={{ marginTop: "20px", color: "#aaa" }}>
                    Coach analysiert deine aktuelle Streak...
                  </p>
                </div>
              ) : kiMotivation ? (
                <p
                  className="ki-text"
                  style={{ fontSize: "1.1rem", marginBottom: 0 }}
                >
                  "{kiMotivation.replace(/\*\*/g, "")}"
                </p>
              ) : (
                <p className="ki-placeholder" style={{ marginBottom: 0 }}>
                  Lass die KI deine Erfolge analysieren.
                </p>
              )}
            </div>

            {/*  BUTTON   */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginTop: "25px",
              }}
            >
              <button
                onClick={holeKIMotivation}
                className="ki-btn"
                disabled={isKiLoading}
                style={{ width: "100%" }}
              >
                {isKiLoading ? "Analysiere..." : "Neue Analyse anfordern"}
              </button>

              {/*  Schließen Button */}
              <button
                onClick={() => setIsKiModalOpen(false)}
                className="modal-btn-close"
                style={{ width: "100%", margin: 0 }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TIPP MODAL */}
      {tippModalOffen && (
        <div className="modal-overlay" onClick={() => setTippModalOffen(null)}>
          <div
            className="modal-content fade-effekt"
            onClick={(e) => e.stopPropagation()}
            style={{ textAlign: "left" }}
          >
            <div className="modal-header" style={{ marginBottom: "15px" }}>
              <h2 style={{ fontSize: "1.2rem", textAlign: "left", padding: 0 }}>
                💡 Tipps für:{" "}
                <span style={{ color: "#007bff" }}>{tippModalOffen.name}</span>
              </h2>
            </div>

            <div
              className="ki-modal-body"
              style={{
                background: "rgba(255, 193, 7, 0.05)",
                border: "1px solid rgba(255, 193, 7, 0.2)",
                alignItems: "flex-start",
                padding: "15px",
              }}
            >
              {isTippLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "100%",
                    padding: "20px 0",
                  }}
                >
                  <div
                    className="spinner"
                    style={{ borderLeftColor: "#ffc107" }}
                  ></div>
                  <p
                    style={{
                      marginTop: "15px",
                      color: "#aaa",
                      fontSize: "0.9rem",
                    }}
                  >
                    Coach sucht die besten Strategien...
                  </p>
                </div>
              ) : (
                <div
                  className="ki-text"
                  style={{
                    fontSize: "0.95rem",
                    lineHeight: "1.6",
                    color: "#e0e0e0",
                  }}
                  /* Nutzt Markdown-ähnliche Formatierung von der KI simpel als Text */
                >
                  {habitTipps.split("\n").map((line, i) => (
                    <p key={i} style={{ marginBottom: "8px" }}>
                      {line.replace(/\*\*/g, "")}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <button
              className="modal-btn-close"
              onClick={() => setTippModalOffen(null)}
              style={{ background: "#ffc107", color: "#000" }}
            >
              Verstanden, los geht's!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
