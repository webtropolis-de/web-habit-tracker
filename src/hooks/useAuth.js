import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Lade deine Daten...");
  const [avatarSeed, setAvatarSeed] = useState("MaleHelmetWarrior16");
  const [xp, setXp] = useState(0);

  // Session beim Start prüfen + bei Auth-Änderungen reagieren
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setAvatarSeed(
          currentUser.user_metadata?.avatar_seed || "MaleHelmetWarrior16",
        );
        setXp(currentUser.user_metadata?.xp || 0);
      }
      if (!session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        setAvatarSeed(
          currentUser.user_metadata?.avatar_seed || "MaleHelmetWarrior16",
        );
        setXp(currentUser.user_metadata?.xp || 0);
      }
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (email, password, zeigeToast) => {
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

  const handleRegister = async (email, password, username, zeigeToast) => {
    setLoadingText("Heuere neuen Helden an...");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: username,
          avatar_seed: "MaleHelmetWarrior16",
          xp: 0,
        },
      },
    });

    if (error) {
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
      zeigeToast("Willkommen in der Gilde, " + username + "!", "success");
    } else {
      zeigeToast("Check deine E-Mails für den Bestätigungslink!", "success");
      setLoading(false);
    }
  };

  const handleLogout = async (zeigeToast, onSuccess) => {
    setLoadingText("Verlasse die Gruppe...");
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      zeigeToast("Logout fehlgeschlagen: " + error.message, "error");
    } else {
      zeigeToast("Sicher zurückgekehrt!", "success");
      if (onSuccess) onSuccess();
    }
    setLoading(false);
  };

  const updateName = async (newName, zeigeToast) => {
    if (!newName.trim()) return;
    setLoadingText("Aktualisiere Namen...");
    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: newName },
    });
    if (error) {
      zeigeToast("Fehler beim Ändern des Namens: " + error.message, "error");
    } else {
      zeigeToast("Name erfolgreich geändert!", "success");
      setUser(data.user);
    }
    setLoading(false);
  };

  const updatePassword = async (newPassword, zeigeToast, validatePassword) => {
    if (
      !validatePassword(newPassword).length ||
      !validatePassword(newPassword).hasNumber
    ) {
      zeigeToast("Passwort erfüllt nicht die Kriterien.", "error");
      return;
    }
    setLoadingText("Aktualisiere Passwort...");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      zeigeToast("Fehler beim Ändern des Passworts: " + error.message, "error");
    } else {
      zeigeToast("Passwort erfolgreich geändert!", "success");
    }
    setLoading(false);
  };

  return {
    user,
    loading,
    loadingText,
    setLoading,
    setLoadingText,
    avatarSeed,
    setAvatarSeed,
    xp,
    setXp,
    handleLogin,
    handleRegister,
    handleLogout,
    updateName,
    updatePassword,
  };
};
