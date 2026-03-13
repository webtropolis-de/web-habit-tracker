// -------------------- Tage & Wochen berechnenn ------------------- //
export const berechnenWochen = (gesamtTage) => {
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

// ----------------------------------- Zufallssprüche Array + Funktion  ---------------- //
const sprueche = [
  "Ein weiterer Schritt aus dem Schatten. Deine Macht wächst!",
  "Schmiede deinen Willen wie eine legendäre Klinge.",
  "Die Götter des Schicksals blicken auf dich – enttäusche sie nicht.",
  "Jeder abgeschlossene Habit ist ein XP-Gewinn für deine Seele.",
  "Selbst der mächtigste Magier begann mit einem einfachen Zauber.",
  "Der Pfad zur Meisterschaft ist steinig, doch nur die Starken beherrschen ihn.",
  "Lass die Müdigkeit dein Training sein. Disziplin ist die wahre Magie.",
  "Ein Tag ohne Fortschritt ist ein verlorener Kampf gegen das Vergessen.",
  "Die Dunkelheit weicht nur dem, der beharrlich sein Licht trägt.",
  "Deine Ausdauer wird in den Hallen der Ewigkeit besungen werden.",
  "Ein Held wird nicht im Licht geboren, sondern im täglichen Kampf geformt.",
  "Unterschätze niemals die Macht kleiner, stetiger Taten.",
  "Dein Wille ist dein stärkster Zauber – wirke ihn weise.",
  "Die Chroniken deines Lebens werden heute geschrieben. Wähle deine Taten.",
  "Rastest du, so rostest du. Die Quest wartet nicht!",
];

export const holeZufallsSpruch = () => {
  return sprueche[Math.floor(Math.random() * sprueche.length)];
}; //  zufälligen Spruch auswählen

// ---------------------------- Passwort Validierung --------------//

export const validatePassword = (pw) => {
  return {
    length: pw.length >= 12,
    hasNumber: /\d/.test(pw),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pw),
  };
};

//-------------------------------- Datum schöner anzeigen -------------//
export const formatDatum = (dateString) => {
  if (!dateString) return "Unbekannt";
  return new Date(dateString).toLocaleDateString();
};

//-------------------------------- Wochenprüfer -------------//

// Prüft, ob ein Datum VOR dem aktuellen Montag liegt
export const istNeueWoche = (letztesResetDatum) => {
  if (!letztesResetDatum) return false;

  const jetzt = new Date();
  const letztesReset = new Date(letztesResetDatum);

  // Finde heraus, an welchem Datum der letzte Montag war
  const tagDerWoche = jetzt.getDay(); // 0 = Sonntag, 1 = Montag...
  const tageSeitMontag = tagDerWoche === 0 ? 6 : tagDerWoche - 1; // Sonntag ist ein Sonderfall

  const letzterMontag = new Date(jetzt);
  letzterMontag.setDate(jetzt.getDate() - tageSeitMontag);
  letzterMontag.setHours(0, 0, 0, 0); // Setze Uhrzeit auf 00:00 Uhr

  // Wenn das letzte Reset VOR dem letzten Montag war -> Neue Woche!
  return letztesReset < letzterMontag;
};
