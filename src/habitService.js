// src/habitService.js
import { supabase } from "./supabaseClient";

export const habitService = {
  datenLaden: async () => {
    return await supabase
      .from("habits")
      .select("*")
      .order("sort_order", { ascending: true }) // <-- NEU: Speichert deine Drag & Drop Reihenfolge
      .order("created_at", { ascending: true }); // Fallback: Neu erstellte Quests landen unten
  },

  habbithinzufuegen: async (neuesHabit) => {
    return await supabase.from("habits").insert([neuesHabit]).select();
  },

  habitLoeschen: async (idVonDatenbank) => {
    return await supabase.from("habits").delete().eq("id", idVonDatenbank);
  },

  tageUpdaten: async (idVonDatenbank, neuerWert) => {
    return await supabase
      .from("habits")
      .update({ days: neuerWert })
      .eq("id", idVonDatenbank);
  },

  datenbankLeeren: async () => {
    return await supabase.from("habits").delete().gt("id", 0);
  },

  wochenReset: async (idVonDatenbank) => {
    // Setzt die Tage auf 0 und trägt die aktuelle Zeit bei last_reset ein
    const jetzt = new Date().toISOString();
    return await supabase
      .from("habits")
      .update({ days: 0, last_reset: jetzt })
      .eq("id", idVonDatenbank);
  },
};
