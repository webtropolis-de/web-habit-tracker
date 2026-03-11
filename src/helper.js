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
  "Jeder Tag ist ein neuer Sieg!",
  "Bleib stark, es lohnt sich",
  "Dein zukünftiges Ich wird dir danken",
  "Einfach weiteratmen und weitermachen",
  "Disziplin ist die Brücke zwischen Zielen und Erfolg",
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