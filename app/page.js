// app/page.js
"use client";

import { useState } from "react";
import { useAuth } from "./components/AuthContext";
import ListMovies from "./components/ListMovies";
import AddedMovies from "./components/AddedMovies";
import DecryptedText from './components/DecryptedText';
import Hero from "./components/Hero";

export default function Home() {
  const { adminAuthenticated } = useAuth();
  const [refreshAddedMovies, setRefreshAddedMovies] = useState(0);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black p-4 lg:p-8">
      <Hero adminAuthenticated={adminAuthenticated} subtitle="Movie Adder" />
      
      {/* Contenu principal */}
      <ListMovies 
        adminAuthenticated={adminAuthenticated}
        onMovieDeleted={() => setRefreshAddedMovies(prev => prev + 1)}
      />
      <AddedMovies refreshTrigger={refreshAddedMovies} />
      <div className="m-20 p-10 w-full flex justify-center opacity-10 hover:opacity-80 transition-opacity">
        <p className="text-gray-700">Site web créé et maintenu par{" "}
          <a className="group text-orange font-bold transition-all hover:underline" href="https://thbo.ch" target="_blank">
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
  );
}