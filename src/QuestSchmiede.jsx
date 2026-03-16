import React, { useState } from "react";
import "./QuestSchmiede.css"; // Verbindet das neue Design!

const QuestSchmiede = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("abstinenz"); // 'abstinenz', 'taeglich', 'wochenziel'
  const [selectedDays, setSelectedDays] = useState([]);
  const [motivation, setMotivation] = useState("");

  // Ziele
  const [zielWert, setZielWert] = useState(""); // Für Abstinenz & Täglich
  const [frequency, setFrequency] = useState(""); // Für Wochenziele

  const tage = ["M", "D", "M", "D", "F", "S", "S"];

  const toggleDay = (index) => {
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter((d) => d !== index));
    } else {
      setSelectedDays([...selectedDays, index]);
    }
  };

  const handleCreate = () => {
    if (!title.trim()) {
      alert("Bitte gib deiner Quest einen Namen!");
      return;
    }

    const newQuest = {
      title,
      type: type,
      frequency: type === "wochenziel" ? frequency : 0,
      goal: type === "abstinenz" || type === "taeglich" ? zielWert : 0,
      target_days: type === "wochenziel" ? selectedDays : [],
      motivation,
      aura_color:
        type === "abstinenz"
          ? "#cc3300"
          : type === "taeglich"
            ? "#007bff"
            : "#ffc107",
    };
    onSave(newQuest);
  };

  return (
    <div className="stone-modal" style={{ position: "relative" }}>
      {/* --- DER X-BUTTON: Fest verankert in der oberen rechten Ecke --- */}
      <button
        className="close-modal"
        onClick={onCancel}
        style={{
          top: "22px",
          right: "15px",
          margin: 0,
          transform: "none",
          zIndex: 10,
        }}
      >
        ✕
      </button>

      <div className="stone-modal-header">
        <h2 className="stone-header">Quest schmieden</h2>
      </div>

      <div className="quest-field">
        <label>Quest-Name</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === "abstinenz"
              ? "Welchem Laster entsagst du?"
              : "Name deiner Quest..."
          }
        />
      </div>

      <div className="quest-field">
        <label>Quest-Typ</label>
        <div className="type-button-group">
          <button
            type="button"
            className={`type-btn abstinenz ${type === "abstinenz" ? "active" : ""}`}
            onClick={() => setType("abstinenz")}
          >
            <span className="icon">🛡️</span>
            <span>Abstinenz</span>
          </button>

          <button
            type="button"
            className={`type-btn taeglich ${type === "taeglich" ? "active" : ""}`}
            onClick={() => setType("taeglich")}
          >
            <span className="icon">💧</span>
            <span>Täglich</span>
          </button>

          <button
            type="button"
            className={`type-btn wochenziel ${type === "wochenziel" ? "active" : ""}`}
            onClick={() => setType("wochenziel")}
          >
            <span className="icon">📅</span>
            <span>Woche</span>
          </button>
        </div>
      </div>

      {/* Dynamische Felder: Zeigen sich je nach ausgewähltem Typ */}
      {(type === "abstinenz" || type === "taeglich") && (
        <div className="quest-field">
          <label>
            {type === "abstinenz" ? "Ziel (Tage durchhalten)" : "Ziel (Tage)"}
          </label>
          <input
            type="number"
            value={zielWert}
            onChange={(e) => setZielWert(e.target.value)}
            placeholder="Leer lassen für ♾️"
          />
        </div>
      )}

      {type === "wochenziel" && (
        <>
          <div className="quest-field">
            <label>Wie oft pro Woche?</label>
            <input
              type="number"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="z.B. 3"
            />
          </div>
          <div className="quest-field">
            <label>Feste Ritual-Tage (Optional)</label>
            <div className="rune-selector">
              {tage.map((t, i) => (
                <div
                  key={i}
                  className={`rune-stone ${selectedDays.includes(i) ? "active" : ""}`}
                  onClick={() => toggleDay(i)}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="quest-field">
        <label>Dein Schwur (Motivation)</label>
        <textarea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Warum tust du dies? (Optional)"
          rows="2"
        />
      </div>

      <div className="stone-modal-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="button" className="btn-save" onClick={handleCreate}>
          In Stein meißeln
        </button>
      </div>
    </div>
  );
};

export default QuestSchmiede;
