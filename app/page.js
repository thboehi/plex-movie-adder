// app/page.js
"use client";

import { useState, useEffect } from "react";
import LoginForm from "./components/LoginForm";
import ListMovies from "./components/ListMovies";
import AddedMovies from "./components/AddedMovies";
import DecryptedText from './components/DecryptedText';
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";

export default function Home() {

  const [authenticated, setAuthenticated] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifie l'authentification en appelant l'API dédiée

    async function checkAuth() {
      try {
        const res = await fetch("/api/check-auth");
        const data = await res.json();
        setAuthenticated(data.authenticated);
        setAdminAuthenticated(data.adminAuthenticated);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la vérification de l'authentification", error);
        setAuthenticated(false);
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/"); // Recharge la page proprement
  };

  const handleLoginSuccess = (role) => {
    if (role === "admin") {
      setAuthenticated(true);
      setAdminAuthenticated(true);
    } else {
      setAuthenticated(true);
      setAdminAuthenticated(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-black p-8">
        <div className="flex justify-center items-center">
          {/* Demi rond stylisé qui tourne */}
          <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm onSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <Navbar current="films" authenticated={authenticated} adminAuthenticated={adminAuthenticated} />
      <main className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-black p-4 lg:p-8">
        <Hero adminAuthenticated={adminAuthenticated} subtitle="Movie Adder" />
        
        {/* Contenu principal */}
        <ListMovies adminAuthenticated={adminAuthenticated} />
        <AddedMovies />
        <div className="m-20 p-10 w-full flex justify-center opacity-10 hover:opacity-80 transition-opacity">
          <p className="text-gray-400 dark:text-gray-700">Site web créé et maintenu par{" "}
            <a className="group text-neon-blue font-bold transition-all hover:underline" href="https://thbo.ch" target="_blank">
              <DecryptedText
                text="thbo.ch"
                speed={80}
                maxIterations={10}
                className="group-hover:underline"
              />
            </a>
          </p>
        </div>
        
      </main>
    </>
  );
}