"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/check-auth");
        const data = await res.json();
        setAuthenticated(data.authenticated);
        setAdminAuthenticated(data.adminAuthenticated || false);
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification", error);
        setAuthenticated(false);
        setAdminAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLoginSuccess = useCallback((role) => {
    if (role === "admin") {
      setAuthenticated(true);
      setAdminAuthenticated(true);
    } else {
      setAuthenticated(true);
      setAdminAuthenticated(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        adminAuthenticated,
        loading,
        handleLoginSuccess,
        handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé dans un AuthProvider");
  }
  return context;
}
