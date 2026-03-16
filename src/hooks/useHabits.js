import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { supabase } from "../supabaseClient";
import { habitService } from "../habitService";
import { istNeueWoche } from "../helper";

const berechneLevelInfo = (aktuelleXp) => {
  let level = 1;
  let xpForNext = 100;
  let xpBase = 0;

  while (aktuelleXp >= xpBase + xpForNext) {
    xpBase += xpForNext;
    level++;
    xpForNext = Math.floor(xpForNext * 1.5);
  }

  const xpImAktuellenLevel = aktuelleXp - xpBase;
  const progressProzent = Math.min(
    (xpImAktuellenLevel / xpForNext) * 100,
    100
  );

  return {
    level,
    xpImAktuellenLevel,
    xpForNext,
    progressProzent,
  };
};

export function useHabits({
  user,
  xp,
  setXp,
  setLoading,
  setLoadingText,
  zeigeToast,
}) {
  const [habits, setHabits] = useState([]);

  useEffect(() => {
    if (!user?.id) return;

    const datenLaden = async () => {
      setLoadingText("Initialisiere Quest...");
      setLoading(true);

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

      await new Promise((resolve) => setTimeout(resolve, 2000));
      setLoading(false);
    };

    datenLaden();
  }, [user?.id, setLoading, setLoadingText]);

  useEffect(() => {
    if (!habits || habits.length === 0) return;

    const speicherTimer = setTimeout(() => {
      habits.forEach(async (habit, index) => {
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

  const habbithinzufuegen = async ({
    eingabeWert,
    zielWert,
    habitType,
    frequency,
    setInputValue,
    setZielWert,
    setFrequency,
    setIsAddModalOpen,
  }) => {
    if (eingabeWert.trim() === "") {
      zeigeToast("Bitte gib einen Namen für das Habit ein!", "error");
      return false;
    }

    if (habitType === "wochenziel" && (!frequency || Number(frequency) <= 0)) {
      zeigeToast(
        "Bitte gib an, wie oft pro Woche du das Ziel erreichen willst!",
        "error"
      );
      return false;
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

    const { data, error } = await habitService.habbithinzufuegen(neuesHabit);

    if (!error && data) {
      setHabits([...habits, data[0]]);
      setInputValue("");
      setZielWert("");
      setFrequency("");
      setIsAddModalOpen(false);
      setLoading(false);
      return true;
    }

    console.error("Supabase Error:", error);
    zeigeToast("Fehler beim Speichern in der Cloud!", "error");
    setLoading(false);
    return false;
  };

  const tagHinzufuegen = async (idVonDatenbank, indexInListe) => {
    const aktuellesHabit = habits[indexInListe];

    const heuteString = new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const isWochenziel = aktuellesHabit.type === "wochenziel";
    const zielGroeße = isWochenziel
      ? aktuellesHabit.frequency
      : aktuellesHabit.goal;

    if (isWochenziel && aktuellesHabit.days >= zielGroeße) {
      zeigeToast("Du hast dein Wochenziel für diese Woche schon erreicht! 🎉");
      return;
    }

    if (!isWochenziel && aktuellesHabit.last_clicked === heuteString) {
      zeigeToast(
        "Stark geblieben! Du hast für heute schon einen Tag eingetragen. Mach morgen weiter! 💪"
      );
      return;
    }

    const neuerWert = aktuellesHabit.days + 1;

    let neuerRekord = aktuellesHabit.best_streak || 0;
    if (neuerWert > neuerRekord) {
      neuerRekord = neuerWert;
    }

    const alteHistory = aktuellesHabit.history || [];
    const neueHistory = [...alteHistory, heuteString];

    const { error } = await supabase
      .from("habits")
      .update({
        days: neuerWert,
        best_streak: neuerRekord,
        last_clicked: heuteString,
        history: neueHistory,
      })
      .eq("id", idVonDatenbank);

    if (!error) {
      let verdienteXp = 10;
      let bonusXp = 0;
      let milestoneText = "";

      if (isWochenziel) {
        if (neuerWert === zielGroeße) {
          verdienteXp = 50;
        }
      } else {
        if (neuerWert >= 30) {
          verdienteXp = 50;
        } else if (neuerWert >= 14) {
          verdienteXp = 30;
        } else if (neuerWert >= 7) {
          verdienteXp = 20;
        } else if (neuerWert >= 3) {
          verdienteXp = 15;
        }

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

      const altesLevel = berechneLevelInfo(xp).level;
      const neuesLevel = berechneLevelInfo(neuesXp).level;

      if (neuesLevel > altesLevel) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#ffc107", "#ff9800", "#ffffff"],
          zIndex: 3000,
        });
        zeigeToast(`🎉 LEVEL UP! Du bist jetzt Level ${neuesLevel}! 🎉`);
      } else if (bonusXp > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 3000,
        });
        zeigeToast(`🏆 ${milestoneText} +${gesamtXpDazu} XP!`);
      } else {
        if (isWochenziel && neuerWert === zielGroeße) {
          zeigeToast("Wochenziel erreicht! +50 XP 🎯");
        } else if (!isWochenziel && verdienteXp > 10) {
          zeigeToast(`🔥 Streak-Bonus! +${verdienteXp} XP`);
        } else {
          zeigeToast("+10 XP gesammelt! ✨");
        }
      }

      setXp(neuesXp);
      await supabase.auth.updateUser({
        data: { xp: neuesXp },
      });

      if (neuerWert === zielGroeße && zielGroeße > 0) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#007bff", "#28a745", "#ffffff"],
        });
      }

      const neueListe = [...habits];
      neueListe[indexInListe].days = neuerWert;
      neueListe[indexInListe].best_streak = neuerRekord;
      neueListe[indexInListe].last_clicked = heuteString;
      neueListe[indexInListe].history = neueHistory;
      setHabits(neueListe);
    } else {
      console.error("Datenbank-Fehler:", error);
      zeigeToast("⚠️ Fehler! DB Error: " + error.message, "error");
    }
  };

  const habitReset = async (idVonDatenbank, indexInListe) => {
    setLoading(true);

    const aktuellesHabit = habits[indexInListe];
    const resetconfirm = window.confirm(
      "Möchtest du den Zähler wirklich zurücksetzen? Das kostet dich 50 XP!"
    );

    if (resetconfirm === true) {
      const { error } = await habitService.tageUpdaten(idVonDatenbank, 0);

      if (!error) {
        let xpStrafe = 0;

        if (aktuellesHabit.days > 0) {
          xpStrafe = Math.min(50, xp);
        }

        if (xpStrafe > 0) {
          const neuesXp = xp - xpStrafe;
          setXp(neuesXp);
          await supabase.auth.updateUser({
            data: { xp: neuesXp },
          });
          zeigeToast(`Streak gebrochen. -${xpStrafe} XP 📉`);
        } else {
          zeigeToast("Zähler auf 0 gesetzt.");
        }

        const neueListe = [...habits];
        neueListe[indexInListe].days = 0;
        setHabits(neueListe);
      } else {
        console.error("Fehler beim Leeren:", error.message);
        zeigeToast("Fehler: " + error.message, "error");
      }
    }

    setLoading(false);
  };

  const habitLoeschen = async (id, index) => {
    if (!window.confirm("Möchtest du dieses Habit wirklich löschen?")) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("habits").delete().eq("id", id);

      if (error) throw error;

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

  const bewegeHoch = (index) => {
    if (index === 0) return;

    const neueListe = [...habits];
    const temp = neueListe[index - 1];
    neueListe[index - 1] = neueListe[index];
    neueListe[index] = temp;
    setHabits(neueListe);
  };

  const bewegeRunter = (index) => {
    if (index === habits.length - 1) return;

    const neueListe = [...habits];
    const temp = neueListe[index + 1];
    neueListe[index + 1] = neueListe[index];
    neueListe[index] = temp;
    setHabits(neueListe);
  };

  const datenbankLeeren = async () => {
    setLoading(true);

    const bestaetigung = window.confirm(
      "Möchtest du wirklich ALLE Habits unwiderruflich aus der Datenbank löschen?"
    );

    if (bestaetigung) {
      const { error } = await habitService.datenbankLeeren();

      if (!error) {
        setHabits([]);
        zeigeToast("Datenbank wurde komplett geleert!");
      } else {
        console.error("Fehler beim Leeren:", error.message);
        zeigeToast("Fehler: " + error.message, "error");
      }
    }

    setLoading(false);
  };

  return {
    habits,
    setHabits,
    berechneLevelInfo,
    habbithinzufuegen,
    tagHinzufuegen,
    habitReset,
    habitLoeschen,
    bewegeHoch,
    bewegeRunter,
    datenbankLeeren,
  };
}
