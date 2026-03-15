import { useState, useEffect, useRef } from "react";
import logo from "./assets/logo.png"; // Logo importieren
import wolf1 from "./assets/wolf_1.png"; // Korrekt (da .png im Ordner)
import wolf2 from "./assets/wolf_2.png"; // Korrekt (da .png im Ordner)
import wolf3 from "./assets/wolf_3.jpg"; // FIX: Hier muss .jpg stehen!

import { supabase } from "./supabaseClient";
import {
  berechnenWochen,
  holeZufallsSpruch,
  validatePassword,
  istNeueWoche,
} from "./helper";
import { habitService } from "./habitService"; // Supabase Services
import confetti from "canvas-confetti";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/habits.css";
import "./styles/auth-profile-rpg.css";

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
    localStorage.getItem("reminder_time") || "20:00",
  );
  const [isKiLoading, setIsKiLoading] = useState(false);
  const [isKiModalOpen, setIsKiModalOpen] = useState(false); // Floating AI Coach
  const [apiKey, setApiKey] = useState(
    localStorage.getItem("gemini_api_key") || "",
  );
  const [kiMotivation, setKiMotivation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState("MaleHelmetWarrior16");
  const [galerieOffen, setGalerieOffen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [showRoadmapModal, setShowRoadmapModal] = useState(false);

  // ---------------------------- Zeit speichern ---------------------------------- //

  // Wird aufgerufen, wenn der User die Uhrzeit ändert
  const speichereZeit = (neueZeit) => {
    setErinnerungZeit(neueZeit);
    localStorage.setItem("reminder_time", neueZeit); // Speichert es lokal

    // Wenn OneSignal da ist, aktualisieren wir das Etikett sofort lautlos im Hintergrund
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(function (OneSignal) {
        OneSignal.User.addTag("weckzeit", neueZeit);
      });
    }
  };

  // --------------------------------------------------KARTEN SORTIEREN --- //
  const bewegeHoch = (index) => {
    if (index === 0) return; // Ist schon ganz oben
    const neueListe = [...habits];
    const temp = neueListe[index - 1];
    neueListe[index - 1] = neueListe[index];
    neueListe[index] = temp;
    setHabits(neueListe); // Der Auto-Archivar speichert das dann automatisch!
  };

  const bewegeRunter = (index) => {
    if (index === habits.length - 1) return; // Ist schon ganz unten
    const neueListe = [...habits];
    const temp = neueListe[index + 1];
    neueListe[index + 1] = neueListe[index];
    neueListe[index] = temp;
    setHabits(neueListe); // Der Auto-Archivar speichert auch das!
  };

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
      let zielTyp = "";
      if (habit.type === "wochenziel") {
        zielTyp =
          "Das ist ein wichtiges Wochen-Abenteuer, das ich mehrfach meistern muss.";
      } else if (habit.type === "taeglich") {
        zielTyp =
          "Das ist eine heilige tägliche Pflicht, die ich ohne Ausnahme jeden Tag erfüllen will.";
      } else {
        zielTyp =
          "Das ist ein dunkles Laster, dem ich entsage. Ich will meine Standhaftigkeit beweisen.";
      }

      const prompt = `Du bist ein weiser Mentor in einer RPG-Gilde. Mein Ziel heißt: "${habit.name}". ${zielTyp} 
  Gib mir exakt 3 extrem kurze, motivierende und psychologisch fundierte Tipps im RPG-Stil, wie ich diese Quest erfolgreich abschließe. 
  Keine Einleitung, direkt zur Sache!`;

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

  // Wird aufgerufen, wenn der User auf den "Aktivieren"-Button klickt
  const aktiviereNotifications = () => {
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async function (OneSignal) {
        // 1. Fragt den User offiziell nach der Erlaubnis (falls noch nicht passiert)
        await OneSignal.Slidedown.promptPush();

        // 2. Klebt das Etikett (z.B. "20:00") fest an den User in der Datenbank
        OneSignal.User.addTag("weckzeit", erinnerungZeit);
      });
      alert(`Push-Magie für ${erinnerungZeit} Uhr aktiviert! 🔔`);
    } else {
      alert("Der Kommunikations-Kristall (OneSignal) lädt noch...");
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
                  text: `Du bist der weise Mentor einer Abenteurer-Gilde. Analysiere diese Quests (Habits): ${habitZusammenfassung}. 
             Schreib einen extrem kurzen, kraftvollen Mentor-Zuspruch auf Deutsch (max 2 Sätze) im RPG-Stil. 
             Nutze Begriffe wie 'Quest', 'Krieger', 'Pfad' oder 'Festung' und sprich den Nutzer direkt mit Namen (${user.user_metadata.display_name}) an.
             Keine Markdown-Formatierung wie fett oder kursiv!`,
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
      setIsAddModalOpen(false);
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

      await supabase.auth.updateUser({
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
  // --------------------- Daten laden -------------------------------------

  // --- DER AUTO-ARCHIVAR (Speichert Drag & Drop im Hintergrund) ---
  useEffect(() => {
    // Wenn die Liste leer ist, mach nichts
    if (!habits || habits.length === 0) return;

    // Wartet 1 Sekunde nach dem Loslassen, bevor er speichert
    const speicherTimer = setTimeout(() => {
      habits.forEach(async (habit, index) => {
        // Nur speichern, wenn sich die Position wirklich geändert hat
        if (habit.sort_order !== index) {
          await supabase
            .from("habits")
            .update({ sort_order: index })
            .eq("id", habit.id);
        }
      });
    }, 1000);

    return () => clearTimeout(speicherTimer);
  }, [habits]);
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
              {/* NEUES RPG DASHBOARD MIT WOLF-BEGLEITER */}
              <div
                className="rpg-card character-main fade-effekt"
                style={{
                  margin: "20px auto",
                  maxWidth: "500px",
                  padding: "15px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    alignItems: "flex-start",
                  }}
                >
                  {/* Avatar & Wolf-Spalte */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div className="avatar-frame mini">
                      <img src={getAvatarUrl(avatarSeed)} alt="Held" />
                    </div>

                    {/* 🐺 WOLF BEGLEITER LOGIK */}
                    {(() => {
                      const isLocked = levelInfo.level < 3;
                      const abstinenzHabits = habits.filter(
                        (h) => h.type === "abstinenz",
                      );
                      const streak =
                        abstinenzHabits.length > 0
                          ? Math.max(...abstinenzHabits.map((h) => h.days))
                          : 0;

                      let currentWolfImg = wolf1;
                      let wolfTitle = "Welpe";
                      if (streak >= 30) {
                        currentWolfImg = wolf3;
                        wolfTitle = "Alpha";
                      } else if (streak >= 7) {
                        currentWolfImg = wolf2;
                        wolfTitle = "Jungwolf";
                      }

                      return (
                        <div
                          className={`familiar-box-mini ${isLocked ? "is-locked" : ""}`}
                        >
                          <div
                            className={`familiar-avatar-mini ${isLocked ? "is-locked" : ""}`}
                          >
                            {isLocked ? (
                              <span className="familiar-icon-locked">🐾</span>
                            ) : (
                              <img
                                src={currentWolfImg}
                                alt="Wolf"
                                className="familiar-img-mini"
                              />
                            )}
                          </div>
                          <span
                            className={`familiar-title-mini ${isLocked ? "is-locked" : ""}`}
                          >
                            {isLocked ? "Spuren..." : wolfTitle}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Charakter-Info & Bindungs-Balken */}
                  <div style={{ flexGrow: 1, textAlign: "left" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <h2
                        className="char-name mini"
                        style={{ margin: 0, fontSize: "1.1rem" }}
                      >
                        {user.user_metadata.display_name}
                      </h2>
                      <div className="level-badge-compact">
                        Lvl {levelInfo.level}
                      </div>
                    </div>

                    <div
                      className="char-rank mini"
                      style={{ marginBottom: "10px", color: "#888" }}
                    >
                      {levelInfo.level >= 50
                        ? "🏆 Legende"
                        : levelInfo.level >= 20
                          ? "⚔️ Ritter"
                          : levelInfo.level >= 10
                            ? "🛡️ Krieger"
                            : "🪵 Novize"}
                    </div>

                    {/* XP Bar */}
                    <div
                      className="xp-progress-section"
                      style={{ padding: 0, marginBottom: "12px" }}
                    >
                      <div className="xp-label-row">
                        <span style={{ fontSize: "0.65rem", color: "#888" }}>
                          Erfahrung
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "#888" }}>
                          {levelInfo.xpImAktuellenLevel}/{levelInfo.xpForNext}
                        </span>
                      </div>
                      <div className="xp-bar-bg" style={{ height: "6px" }}>
                        <div
                          className="xp-bar-fill"
                          style={{ width: `${levelInfo.progressProzent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* 🐺 WOLF-BINDUNG */}
                    {(() => {
                      const isLocked = levelInfo.level < 3;
                      const abstinenzHabits = habits.filter(
                        (h) => h.type === "abstinenz",
                      );
                      const streak =
                        abstinenzHabits.length > 0
                          ? Math.max(...abstinenzHabits.map((h) => h.days))
                          : 0;
                      const nextGoal = streak < 7 ? 7 : 30;
                      const lockProgress = Math.min(
                        (levelInfo.level / 3) * 100,
                        100,
                      );

                      return (
                        <div className="familiar-binding-container">
                          <div className="familiar-binding-header">
                            <span
                              className={`familiar-binding-title ${isLocked ? "is-locked" : ""}`}
                            >
                              {isLocked
                                ? "🐾 Spuren entdeckt..."
                                : "🐺 Wolfs-Entwicklung"}
                            </span>
                            {isLocked ? (
                              <span className="familiar-binding-status is-locked">
                                Lvl 3 benötigt
                              </span>
                            ) : streak < 30 ? (
                              <span className="familiar-binding-status">
                                Noch {nextGoal - streak} Tage
                              </span>
                            ) : (
                              <span className="familiar-binding-status is-max">
                                MAX
                              </span>
                            )}
                          </div>
                          <div className="mini-progress-bg">
                            <div
                              className={`mini-progress-fill ${isLocked ? "is-locked" : ""}`}
                              style={{
                                width: isLocked
                                  ? `${lockProgress}%`
                                  : `${Math.min((streak / nextGoal) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              {/* WICHTIG: Hier endet die Charakterkarte. Danach kommt dein Button: */}

              {/* BUTTON  FORMULAR */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="add-button"
                style={{
                  width: "100%",
                  marginBottom: "25px",
                  padding: "16px",
                  fontSize: "1.1rem",
                }}
              >
                ➕ Neue Quest starten
              </button>

              {/* --- TOOLBAR: BELOHNUNGEN & SORTIEREN --- */}
              <div className="toolbar_start">
                {/* LINKS: Belohnungen / Roadmap (immer sichtbar) */}
                <button
                  onClick={() => setShowRoadmapModal(true)}
                  className="rpg-trigger"
                  style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                >
                  📜 Belohnungen
                </button>

                {/* RECHTS: Sortieren (nur sichtbar wenn mehr als 1 Habit existiert) */}
                {habits.length > 1 && (
                  <button
                    onClick={() => setIsSortMode(!isSortMode)}
                    className={`rpg-trigger ${isSortMode ? "is-active" : ""}`}
                    style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                  >
                    {isSortMode
                      ? "✅ Sortieren beenden"
                      : "↕️ Quests sortieren"}
                  </button>
                )}
              </div>

              {/* --- DIE MASSIVE STEIN-LISTE (OHNE DRAG & DROP) --- */}
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
                      className={`habit-row fade-in-view habit-card-${habit.type} ${istErledigt ? "completed" : ""}`}
                    >
                      {/* ⬆️⬇️ Rauf / Runter Buttons (NUR SICHTBAR WENN SORTIERMODUS AN IST) */}
                      {isSortMode && (
                        <div className="sort-buttons-container">
                          <button
                            onClick={() => bewegeHoch(index)}
                            disabled={index === 0}
                            className="sort-btn"
                            title="Quest nach oben verschieben"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => bewegeRunter(index)}
                            disabled={index === habits.length - 1}
                            className="sort-btn"
                            title="Quest nach unten verschieben"
                          >
                            ▼
                          </button>
                        </div>
                      )}

                      {/* 📜 Text-Bereich & Info-Bar */}
                      <div className="habit-text-container">
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <h3 className="habit-title">{habit.name}</h3>
                          <span className="habit-subtitle">
                            {habit.type === "wochenziel"
                              ? " 🏰 Wochen-Quest"
                              : habit.type === "taeglich"
                                ? "📅Tägliche Pflicht"
                                : "🛡️ Abstinenz"}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {zielGroeße > 0 && (
                          <div
                            className="habit-progress-container"
                            style={{ margin: "10px 0" }}
                          >
                            <div
                              className={`habit-progress-bar ${istErledigt ? "completed" : ""}`}
                              style={{
                                width: `${Math.min((habit.days / zielGroeße) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                        )}

                        {/* 🛠️ NEU: Kompakte Info-Bar UNTER dem Fortschritt */}
                        <div className="rpg-info-bar">
                          <button
                            className="rpg-rune-btn"
                            onClick={() => setOffenerKalender(habit)}
                          >
                            <span>📅</span>
                          </button>
                          {apiKey && (
                            <button
                              className="rpg-rune-btn gold"
                              onClick={() => holeHabitTipps(habit)}
                            >
                              <span>💡</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ⚙️ Zähler & Buttons (Rechts) - KOMBINIERT! */}
                      <div className="habit-actions-wrapper">
                        <div className="habit-row-actions">
                          {/* HAUPT-BUTTON (Zahlen & Plus in einem!) */}
                          <button
                            onClick={() => tagHinzufuegen(habit.id, index)}
                            className={`action-zone-main ${
                              !(
                                (isWochenziel && istErledigt) ||
                                (!isWochenziel &&
                                  habit.last_clicked === aktuellesdatum)
                              )
                                ? "magische-quest"
                                : "is-locked"
                            }`}
                            title="Tag hinzufügen"
                          >
                            <div className="action-counter">
                              <span
                                className={istErledigt ? "text-success" : ""}
                              >
                                {habit.days}
                              </span>
                              {zielGroeße > 0 && (
                                <span className="text-goal">/{zielGroeße}</span>
                              )}
                            </div>
                            <div className="action-icon">+</div>
                          </button>

                          {/* KLEINE BUTTONS */}
                          <div className="action-side-column">
                            <button
                              onClick={() => habitReset(habit.id, index)}
                              className="action-zone-small reset"
                              title="Zurücksetzen"
                            >
                              🔄
                            </button>
                            <button
                              onClick={() => habitLoeschen(habit.id, index)}
                              className="action-zone-small delete"
                              title="Löschen"
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
                  title="Gilden-Mentor um Rat fragen" // Titel angepasst
                >
                  <img
                    src="avatars/MaleHumanElveMage51.png"
                    alt="Runenmeister"
                    className="ki-coach-avatar"
                  />
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
                      <h4
                        style={{
                          margin: "0 auto",
                          color: "#b8860b",
                          textShadow: "1px 1px 0 #000",
                        }}
                      >
                        {habit.name}
                      </h4>
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
                <p> Coming soon</p>
              </div>
            </div>
          )}

          {/* PROFILE VIEW */}
          {aktuelleAnsicht === "profile" && (
            <div className="profile-view fade-effekt" key="profile-view">
              <h1>Dein Account ⚙️</h1>
              <p className="quote">
                Verwalte deine persönlichen Einstellungen.
              </p>
              {/* DIE KOMPAKTE CHARAKTER-KARTE IM PROFIL */}
              <div className="rpg-card profile-character-card fade-effekt">
                <div className="profile-character-content">
                  {/* Header: Avatar links, Texte bündig rechts daneben */}
                  <div className="profile-card-header">
                    <div className="profile-avatar-frame">
                      <img
                        src={getAvatarUrl(avatarSeed)}
                        alt="Held"
                        className="profile-img"
                      />
                    </div>
                    <div className="profile-text-zone">
                      <h2 className="profile-name-title">
                        {user.user_metadata.display_name}
                      </h2>
                      <div className="profile-rank-title">
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

                  {/* Fortschrittsbalken-Sektion */}
                  <div className="profile-progress-section">
                    <div className="profile-label-row">
                      <span>ERFAHRUNG (LVL {levelInfo.level})</span>
                      <span>
                        {levelInfo.xpImAktuellenLevel} / {levelInfo.xpForNext}{" "}
                        XP
                      </span>
                    </div>
                    <div className="xp-bar-bg profile-progress-bg">
                      <div
                        className="xp-bar-fill profile-progress-fill"
                        style={{ width: `${levelInfo.progressProzent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* BUTTON GRUPPE: Eng zusammengefasst für einheitliche Optik */}
                  <div className="profile-actions-group">
                    {!galerieOffen ? (
                      <button
                        className="rpg-button-secondary"
                        onClick={() => setGalerieOffen(true)}
                      >
                        🛡️ KLASSE WECHSELN
                      </button>
                    ) : (
                      <div
                        className="galerie-mini-box fade-effekt"
                        style={{
                          padding: "15px",
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid #333",
                          marginBottom: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "15px",
                          }}
                        >
                          <h3 style={{ margin: 0, fontSize: "0.9rem" }}>
                            Wähle deine Klasse
                          </h3>
                          <button
                            onClick={() => setGalerieOffen(false)}
                            className="close-modal"
                            style={{
                              position: "static",
                              transform: "none",
                              display: "flex",
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
                            {
                              id: "FemaleRouge7",
                              label: "Schurkin",
                              minLevel: 5,
                            },
                            {
                              id: "FemaleElves2",
                              label: "Waldläuferin",
                              minLevel: 5,
                            },
                            {
                              id: "Werwolfs41",
                              label: "Werwolf",
                              minLevel: 10,
                            },
                            {
                              id: "Skeletons20",
                              label: "Skelett",
                              minLevel: 15,
                            },
                          ].map((char) => {
                            const isLocked = levelInfo.level < char.minLevel;
                            return (
                              <div
                                key={char.id}
                                className={`avatar-card ${avatarSeed === char.id ? "active" : ""} ${isLocked ? "locked" : ""}`}
                                onClick={async () => {
                                  if (isLocked) {
                                    zeigeToast(
                                      `🔒 Erst ab Level ${char.minLevel} verfügbar!`,
                                      "error",
                                    );
                                    return;
                                  }
                                  setAvatarSeed(char.id);
                                  setGalerieOffen(false);
                                  const { data, error } =
                                    await supabase.auth.updateUser({
                                      data: { avatar_seed: char.id },
                                    });
                                  if (error) {
                                    zeigeToast(
                                      "Fehler: " + error.message,
                                      "error",
                                    );
                                  } else if (data?.user) {
                                    setUser(data.user);
                                    zeigeToast(
                                      `${char.label} ausgewählt!`,
                                      "success",
                                    );
                                  }
                                }}
                              >
                                <div className="avatar-preview-box">
                                  <img
                                    src={getAvatarUrl(char.id)}
                                    alt={char.label}
                                    style={{
                                      filter: isLocked
                                        ? "grayscale(1) brightness(0.4)"
                                        : "none",
                                      imageRendering: "pixelated",
                                      width: "100%",
                                      height: "100%",
                                      display: "block",
                                    }}
                                  />
                                  {isLocked && (
                                    <div className="lock-icon">🔒</div>
                                  )}
                                </div>
                                <span className="avatar-label">
                                  {isLocked
                                    ? `Lvl ${char.minLevel}`
                                    : char.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <button
                      className="rpg-button-secondary"
                      onClick={() => setShowRoadmapModal(true)}
                    >
                      📜 KOMMENDE BELOHNUNGEN
                    </button>
                  </div>

                  {/* STATS REIHE GANZ UNTEN */}
                  <div className="rpg-stats-row">
                    <div className="stat-item">
                      <span className="stat-label">STUFE</span>
                      <span className="stat-value">{levelInfo.level}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">LEVEL XP</span>
                      <span className="stat-value" style={{ color: "#9d71e8" }}>
                        {levelInfo.xpImAktuellenLevel} / {levelInfo.xpForNext}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">GESAMT XP</span>
                      <span className="stat-value">{xp}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* 🐺 DIE BEGLEITER-RUHMESHALLE (WOLF BOX) */}
              <div className="rpg-card familiar-profile-card fade-effekt">
                {(() => {
                  const isLocked = levelInfo.level < 3;
                  const abstinenzHabits = habits.filter(
                    (h) => h.type === "abstinenz",
                  );
                  const streak =
                    abstinenzHabits.length > 0
                      ? Math.max(...abstinenzHabits.map((h) => h.days))
                      : 0;

                  let currentWolfImg = wolf1;
                  let wolfTitle = "Wolfswelpe";
                  let statusBeschrieb =
                    "Dein Begleiter ist noch jung und braucht deine eiserne Disziplin.";

                  if (streak >= 30) {
                    currentWolfImg = wolf3;
                    wolfTitle = "Alpha Schattenwolf";
                    statusBeschrieb =
                      "Ein legendärer Anführer der Schatten. Er spiegelt deine unbezwingbare Willenskraft wider.";
                  } else if (streak >= 7) {
                    currentWolfImg = wolf2;
                    wolfTitle = "Junger Schattenwolf";
                    statusBeschrieb =
                      "Die Jagd hat begonnen. Er ist kräftig geworden und weicht nicht von deiner Seite.";
                  }

                  const nextGoal = streak < 7 ? 7 : 30;
                  const progressPercent = Math.min(
                    (streak / nextGoal) * 100,
                    100,
                  );
                  const lockProgress = Math.min(
                    (levelInfo.level / 3) * 100,
                    100,
                  );

                  return (
                    <div className="familiar-profile-content">
                      <div className="familiar-card-header">
                        <div
                          className={`familiar-avatar-frame ${isLocked ? "is-locked" : ""}`}
                        >
                          {isLocked ? (
                            <span className="familiar-locked-icon-large">
                              🐾
                            </span>
                          ) : (
                            <img
                              src={currentWolfImg}
                              alt="Wolf"
                              className="familiar-img"
                            />
                          )}
                        </div>
                        <div className="familiar-text-zone">
                          <h2
                            className={`familiar-name-title ${isLocked ? "is-locked" : ""}`}
                          >
                            {isLocked ? "Unbekannte Fährte" : wolfTitle}
                          </h2>
                          <p
                            className={`familiar-description ${isLocked ? "is-locked" : ""}`}
                          >
                            {isLocked
                              ? "Im Wald um die Gilde hast du Spuren gefunden. Erreiche Level 3, um das Wesen anzulocken."
                              : `"${statusBeschrieb}"`}
                          </p>
                        </div>
                      </div>

                      <div className="familiar-progress-section">
                        <div className="familiar-label-row">
                          <span>{isLocked ? "Gilden-Ruf" : "Fortschritt"}</span>
                          {isLocked ? (
                            <span>Lvl {levelInfo.level} / 3</span>
                          ) : streak < 30 ? (
                            <span>
                              {streak} / {nextGoal} Tage
                            </span>
                          ) : (
                            <span>MAXIMALE STUFE</span>
                          )}
                        </div>
                        <div className="xp-bar-bg familiar-progress-bg">
                          <div
                            className={`xp-bar-fill familiar-progress-fill ${isLocked ? "is-locked" : ""}`}
                            style={{
                              width: isLocked
                                ? `${lockProgress}%`
                                : `${progressPercent}%`,
                            }}
                          ></div>
                        </div>
                        <p className="familiar-footer-note">
                          {isLocked
                            ? "Wird ab Level 3 freigeschaltet"
                            : "Gekoppelt an deinen höchsten Abstinenz-Streak"}
                        </p>
                      </div>
                    </div>
                  );
                })()}
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
                <h3>Gilden-Mentor aktivieren</h3>
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
              <h2>{offenerKalender.name}</h2>
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
      {/* --- 🧙‍♂️ KI MENTOR MODAL (RUNENMEISTER) --- */}
      {isKiModalOpen && (
        <div className="modal-overlay" onClick={() => setIsKiModalOpen(false)}>
          <div
            className="modal-content fade-effekt"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 style={{ fontSize: "1.4rem", margin: 0 }}>
                Rat des Runenmeisters
              </h2>
              <button
                className="close-modal"
                onClick={() => setIsKiModalOpen(false)}
                style={{ display: "flex" }}
              >
                ✕
              </button>
            </div>

            <div className="ki-coach-zone">
              <img
                src="avatars/MaleHumanElveMage51.png"
                alt="Runenmeister"
                className="ki-coach-avatar"
              />

              {isKiLoading ? (
                /* Der funktionierende Lade-Spinner in der Sprechblase */
                <div
                  className="ki-coach-speech-bubble"
                  style={{ textAlign: "center", padding: "30px 10px" }}
                >
                  <div
                    className="spinner"
                    style={{ margin: "0 auto 15px auto" }}
                  ></div>
                  <p style={{ margin: 0, color: "#aaa", fontStyle: "italic" }}>
                    Der Magier befragt die alten Schriften...
                  </p>
                </div>
              ) : (
                /* Die Text-Sprechblase */
                <div className="ki-coach-speech-bubble">
                  <p className="ki-text" style={{ margin: 0 }}>
                    {kiMotivation ||
                      "Tritt näher, Reisender. Befrage die Runen, um magischen Beistand für deine heutigen Quests zu erhalten."}
                  </p>
                </div>
              )}

              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  onClick={holeKIMotivation}
                  className="ki-coach-btn"
                  disabled={isKiLoading}
                  style={{ width: "100%" }}
                >
                  {isKiLoading ? "Mana wird gesammelt..." : "Befrage die Runen"}
                </button>

                <button
                  onClick={() => setIsKiModalOpen(false)}
                  className="modal-btn-close"
                  style={{ width: "100%", margin: 0 }}
                >
                  Zurück zum Pfad
                </button>
              </div>
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
            <div
              className="modal-header"
              style={{
                flexDirection: "column",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span style={{ fontSize: "1.5rem" }}>📜</span>
              <h2
                style={{
                  fontSize: "1.2rem",
                  textAlign: "center",
                  padding: "0 10px",
                  margin: 0,
                  lineHeight: "1.2",
                }}
              >
                Strategie für:
                <br />
                <span
                  style={{
                    color: "#d4af37",
                    display: "block",
                    marginTop: "5px",
                  }}
                >
                  {tippModalOffen.name}
                </span>
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
                  {/* Der funktionierende Gilden-Spinner */}
                  <div className="spinner"></div>
                  <p
                    style={{
                      marginTop: "15px",
                      color: "#aaa",
                      fontSize: "0.9rem",
                      fontStyle: "italic",
                    }}
                  >
                    Der Mentor studiert die alten Schriften...
                  </p>
                </div>
              ) : (
                <div
                  className="ki-text"
                  style={{
                    fontSize: "0.95rem",
                    lineHeight: "1.6",
                    color: "#e0e0e0",
                    fontStyle: "italic",
                  }}
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
              style={{
                background: "linear-gradient(to bottom, #444, #222)",
                color: "#fff",
                border: "1px solid #555",
              }}
            >
              Quest annehmen
            </button>
          </div>
        </div>
      )}

      {/* NEUE QUEST MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="modal-content fade-effekt"
            onClick={(e) => e.stopPropagation()}
            style={{ padding: "25px 20px" }}
          >
            <div className="modal-header" style={{ marginBottom: "20px" }}>
              <h2
                style={{ fontSize: "1.3rem", margin: 0, textAlign: "center" }}
              >
                📜 Neue Quest
              </h2>
              <button
                className="close-modal"
                onClick={() => setIsAddModalOpen(false)}
                style={{ display: "flex" }}
              >
                ✕
              </button>
            </div>

            {/* Hier ist dein altes Formular, leicht angepasst für das Modal */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                textAlign: "left",
              }}
            >
              {/* Typ-Auswahl */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setHabitType("abstinenz")}
                  style={{
                    flex: 1,
                    padding: "10px 5px",
                    borderRadius: "0",
                    border:
                      habitType === "abstinenz"
                        ? "2px solid #cc3300"
                        : "1px solid #444",
                    backgroundColor:
                      habitType === "abstinenz"
                        ? "rgba(204, 51, 0, 0.15)"
                        : "#2a2a35",
                    color: habitType === "abstinenz" ? "#fff" : "#aaa",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  🛡️ Abstinenz
                </button>
                <button
                  type="button"
                  onClick={() => setHabitType("taeglich")}
                  style={{
                    flex: 1,
                    padding: "10px 5px",
                    borderRadius: "0",
                    border:
                      habitType === "taeglich"
                        ? "2px solid #007bff"
                        : "1px solid #444",
                    backgroundColor:
                      habitType === "taeglich"
                        ? "rgba(0, 123, 255, 0.15)"
                        : "#2a2a35",
                    color: habitType === "taeglich" ? "#fff" : "#aaa",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  💧 Täglich
                </button>
                <button
                  type="button"
                  onClick={() => setHabitType("wochenziel")}
                  style={{
                    flex: 1,
                    padding: "10px 5px",
                    borderRadius: "0",
                    border:
                      habitType === "wochenziel"
                        ? "2px solid #ffc107"
                        : "1px solid #444",
                    backgroundColor:
                      habitType === "wochenziel"
                        ? "rgba(255, 193, 7, 0.15)"
                        : "#2a2a35",
                    color: habitType === "wochenziel" ? "#fff" : "#aaa",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  📅 Woche
                </button>
              </div>

              {/* Eingabefelder */}
              <input
                className="habit-input"
                type="text"
                placeholder={
                  habitType === "abstinenz"
                    ? "Welchem Laster entsagst du?"
                    : habitType === "taeglich"
                      ? "Welche tägliche Quest trittst du an?"
                      : "Welches Wochen-Abenteuer planst du?"
                }
                value={eingabeWert}
                required
                onChange={(e) => setInputValue(e.target.value)}
                style={{ width: "100%", margin: 0 }}
              />

              <div
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                <div style={{ flex: 1 }}>
                  {habitType === "abstinenz" || habitType === "taeglich" ? (
                    <input
                      className="goal-input"
                      type="number"
                      value={zielWert}
                      onChange={(e) => setZielWert(e.target.value)}
                      placeholder={
                        habitType === "taeglich"
                          ? "Ziel (Tage) – Leer für ♾️"
                          : "Abstinent für (Tage)– Leer für ♾️"
                      }
                      style={{ width: "100%", margin: 0 }}
                    />
                  ) : (
                    <input
                      className="goal-input"
                      type="number"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      placeholder="Wiederholungen pro Woche"
                      style={{ width: "100%", margin: 0 }}
                    />
                  )}
                </div>
              </div>

              <button
                onClick={habbithinzufuegen}
                className="add-button"
                style={{ width: "100%", marginTop: "10px" }}
              >
                Quest ins Logbuch eintragen
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoadmapModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowRoadmapModal(false)}
        >
          <div
            className="modal-content roadmap-modal fade-effekt"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Gilden-Roadmap</h2>
              <button
                className="close-modal"
                onClick={() => setShowRoadmapModal(false)}
              >
                ✕
              </button>
            </div>

            <p className="modal-subtitle">Deine Reise zum legendären Helden</p>

            <div className="roadmap-list">
              {[
                { lvl: 1, reward: "Ritter & Kriegerin", type: "Klasse" },
                { lvl: 3, reward: "Wolfswelpe", type: "Begleiter" },
                { lvl: 5, reward: "Schurkin & Waldläuferin", type: "Klasse" },
                { lvl: 7, reward: "Junger Schattenwolf", type: "Begleiter" },
                { lvl: 10, reward: "Werwolf", type: "Klasse" },
                { lvl: 15, reward: "Skelett-Krieger", type: "Klasse" },
                { lvl: 30, reward: "Alpha Schattenwolf", type: "Begleiter" },
                { lvl: 50, reward: "Rang: Legende", type: "Titel" },
              ].map((item, index) => {
                const reached = levelInfo.level >= item.lvl;
                return (
                  <div
                    key={index}
                    className={`roadmap-item ${reached ? "reached" : "locked"}`}
                  >
                    <div className="roadmap-lvl">LVL {item.lvl}</div>
                    <div className="roadmap-info">
                      <div className="roadmap-reward">{item.reward}</div>
                      <div className="roadmap-type">{item.type}</div>
                    </div>
                    <div className="roadmap-status">
                      {reached ? "✅" : "🔒"}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="modal-btn-close"
              onClick={() => setShowRoadmapModal(false)}
            >
              Zurück zum Pfad
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
