// src/LegalModals.jsx
import React from "react";

export function ImpressumModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content quest-schmiede-container" onClick={(e) => e.stopPropagation()}>
        <h2 className="habit-title">Impressum</h2>
        <div className="habit-description" style={{ whiteSpace: 'pre-line', textAlign: 'left', margin: '20px 0' }}>
          {`Angaben gemäß § 5 TMG:
          
          Rhein Audio Festival GmbH
          Widdersdorfer Str. 244a
          50825 Köln

          Vertreten durch:
          Eric Hermann

          Kontakt:
          Telefon: +49 178 8895843
          E-Mail: eric@webtropolis.de

          Registereintrag:
          Eintragung im Handelsregister.
          Registergericht: Köln
          Registernummer: HRB 114418

          Umsatzsteuer-ID:
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
          DE364296619

          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV:
          Eric Hermann
          Widdersdorfer Str. 244a
          50825 Köln`}
        </div>
        <button className="add-button" onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
}

export function DatenschutzModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content quest-schmiede-container" onClick={(e) => e.stopPropagation()}>
        <h2 className="habit-title">Datenschutz</h2>
        <div className="habit-description" style={{ whiteSpace: 'pre-line', textAlign: 'left', margin: '20px 0', fontSize: '0.8rem' }}>
          {`1. Datenschutz auf einen Blick
          Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Diese App verarbeitet personenbezogene Daten (z.B. E-Mail-Adresse, IP-Adresse) nur im Rahmen der gesetzlichen Vorschriften (DSGVO), um den Dienst bereitzustellen.
          
          2. Speicherung von Daten auf dem Endgerät
          Um Sie in der App eingeloggt zu halten (Session-Management), nutzt diese App den lokalen Speicher ("Local Storage") Ihres Endgeräts. Dies ist technisch notwendig für die Kernfunktion der App (Art. 6 Abs. 1 lit. f DSGVO).
          
          3. Hosting & Dienste von Drittanbietern
          - Hoster: All-Inkl (Neue Medien Münnich), Hauptstraße 68, 02742 Friedersdorf, Deutschland.
          - Datenbank & Login (Auth): Supabase Inc., 800 Market St, San Francisco, CA 94102, USA. 
          - Push-Benachrichtigungen: OneSignal, 2850 S Delaware St, San Mateo, CA 94403, USA.
          
          Hinweis zum USA-Datentransfer: Bei der Nutzung von Supabase und OneSignal können Daten auf Server in den USA übertragen werden. Wir achten darauf, dass die Anbieter sich dem "EU-US Data Privacy Framework" angeschlossen haben oder Standardvertragsklauseln der EU-Kommission nutzen.
          
          4. Ihre Rechte
          Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten. Sie haben außerdem ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten. Zudem steht Ihnen ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu. 
          Kontaktieren Sie uns hierzu jederzeit über die im Impressum angegebene E-Mail-Adresse.
          Unsere ausführliche Datenschutzerklärung findest du unter webtropolis.de/datenschutz.`}
        </div>
        <button className="add-button" onClick={onClose}>Gelesen</button>
      </div>
    </div>
  );
}