import React, { useState } from "react";
import "./Onboarding.css";

const Onboarding = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedAvatar, setSelectedAvatar] = useState("MaleHelmetWarrior16");

  const nextStep = () => setStep(step + 1);

  return (
    <div className="onboarding-overlay">
      {/* --- WICHTIG: Die Klasse 'rpg-modal' und 'stone-texture' hinzufügen --- */}
      <div className="onboarding-card rpg-modal stone-texture fade-effekt">
        {step === 1 && (
          <div className="onboarding-step fade-in-view">
            <h2>Willkommen, Reisender!</h2>
            <p className="modal-subtitle">Deine Reise beginnt hier.</p>
            <p>Dein Name steht bereits in den Chroniken:</p>
            <div className="name-display">
              {user.user_metadata.display_name}
            </div>
            <p>Bist du bereit, dein Schicksal in die Hand zu nehmen?</p>
            {/* --- WICHTIG: Die Klasse 'login-button' für RPG-Optik nutzen --- */}
            <button className="login-button" onClick={nextStep}>
              Ich bin bereit!
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step fade-in-view">
            <h2>Wähle deine Klasse</h2>
            <p className="modal-subtitle">Die Welt braucht Helden.</p>
            <div className="avatar-selection-grid">
              <div
                className={`avatar-option ${selectedAvatar === "MaleHelmetWarrior16" ? "active" : ""}`}
                onClick={() => setSelectedAvatar("MaleHelmetWarrior16")}
              >
                <div className="avatar-frame mini">
                  <img src="avatars/MaleHelmetWarrior16.png" alt="Ritter" />
                </div>
                <span>Ritter</span>
              </div>
              <div
                className={`avatar-option ${selectedAvatar === "FemaleWarrior13" ? "active" : ""}`}
                onClick={() => setSelectedAvatar("FemaleWarrior13")}
              >
                <div className="avatar-frame mini">
                  <img src="avatars/FemaleWarrior13.png" alt="Kriegerin" />
                </div>
                <span>Kriegerin</span>
              </div>
            </div>
            <p className="hint">
              Weitere Klassen wie Waldläufer oder Werwolf schaltest du durch XP
              frei!
            </p>
            <button className="login-button" onClick={nextStep}>
              Diese Klasse wählen
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step fade-in-view">
            <h2>Deine Werkzeuge</h2>
            <p className="modal-subtitle">Nutze sie weise.</p>
            <ul className="feature-intro">
              <li>
                <span>📜</span> <b>Quests:</b> Schmiede Ziele und meistere sie
                an Ritual-Tagen.
              </li>
              <li>
                <span>🐺</span> <b>Begleiter:</b> Dein Wolf wächst mit deiner
                Disziplin.
              </li>
              <li>
                <span>🧙‍♂️</span> <b>Mentor:</b> Die KI berät dich in dunklen
                Stunden.
              </li>
            </ul>
            <button
              className="login-button pulse"
              onClick={() => onComplete(selectedAvatar)}
            >
              Reise beginnen!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
