// src/habitService.js
import { supabase } from "./supabaseClient";

export const habitService = {
  datenLaden: async () => {
    return await supabase.from("habits").select("*").order("created_at", { ascending: true });
  },
  
  habbithinzufuegen: async (neuesHabit) => {
    return await supabase.from("habits").insert([neuesHabit]).select();
  },
  
  habitLoeschen: async (idVonDatenbank) => {
    return await supabase.from("habits").delete().eq("id", idVonDatenbank);
  },
  
  tageUpdaten: async (idVonDatenbank, neuerWert) => {
    return await supabase.from("habits").update({ days: neuerWert }).eq("id", idVonDatenbank);
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
  }
};

