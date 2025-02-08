// app/components/LoginForm.js
"use client";

import { useState } from "react";

export default function LoginForm({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
      } else {
        setError("Mot de passe incorrect");
      }
    } catch (err) {
      console.error("Erreur lors de l'authentification", err);
      setError("Erreur lors de l'authentification");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-black p-8">
      <header className="flex flex-col items-center mb-12">
        {/* Logo SVG de Plex */}
        <div className="w-40 mb-1">

          {/* LOGO SVG FOND NOIR POUR THEME BLANC */}
          <svg
            id="Calque_2"
            data-name="Calque 2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 460.9"
            className="dark:hidden"
          >
            <defs>
              <style>{`
                .cls-1, .cls-2 {
                  stroke-width: 0px;
                }
                .cls-2 {
                  fill: #ebaf00;
                }
              `}</style>
            </defs>
            <g id="plex-logo">
              <path
                id="path4"
                className="cls-1"
                d="M164.19,82.43c-39.86,0-65.54,11.49-87.16,38.51v-29.73H0v366.22s1.35.68,5.41,1.35c5.41,1.35,33.78,7.43,54.73-10.14,18.24-15.54,22.3-33.78,22.3-54.05v-52.7c22.3,23.65,47.3,33.78,82.43,33.78,75.68,0,133.78-61.49,133.78-143.24,0-88.51-56.08-150-134.46-150h0ZM149.32,306.08c-42.57,0-76.35-35.14-76.35-77.7s39.86-75.68,76.35-75.68c43.24,0,76.35,33.11,76.35,76.35s-33.78,77.03-76.35,77.03Z"
              />
              <path
                id="path6"
                className="cls-1"
                d="M408.11,223.65c0,31.76,3.38,70.27,34.46,112.16.68.68,2.03,2.7,2.03,2.7-12.84,21.62-28.38,36.49-49.32,36.49-16.22,0-32.43-8.78-45.95-23.65-14.19-16.22-20.95-37.16-20.95-59.46V0h79.05l.68,223.65Z"
              />
              <polygon
                id="polygon8"
                className="cls-2"
                points="796.62 229.05 703.38 91.22 799.32 91.22 891.89 229.05 799.32 366.22 703.38 366.22 796.62 229.05"
              />
              <polygon
                id="polygon10"
                className="cls-1"
                points="916.89 213.51 1000 91.22 904.05 91.22 869.59 141.89 916.89 213.51"
              />
              <path
                id="path12"
                className="cls-1"
                d="M869.59,316.22l16.22,22.3c15.54,24.32,35.81,36.49,59.46,36.49,25-.68,42.57-22.3,49.32-30.41,0,0-12.16-10.81-27.7-29.05-20.95-24.32-48.65-68.92-49.32-70.95l-47.97,71.62Z"
              />
              <path
                id="path16"
                className="cls-1"
                d="M632.43,287.16c-16.22,14.86-27.03,22.97-49.32,22.97-39.86,0-62.84-28.38-66.22-59.46h211.49c1.35-4.05,2.03-9.46,2.03-18.24,0-85.81-62.84-150-145.27-150s-142.57,65.54-142.57,147.3,64.19,145.27,144.59,145.27c56.08,0,104.73-31.76,131.08-87.84h-85.81ZM585.81,147.3c35.14,0,61.49,22.97,67.57,53.38h-133.78c6.76-31.76,31.76-53.38,66.22-53.38h0Z"
              />
            </g>
          </svg>

          {/* LOGO SVG FOND BLANC POUR THEME NOIR */}
          <svg
            id="Calque_2"
            data-name="Calque 2"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 460.9"
            className="hidden dark:block"
          >
            <defs>
              <style>{`
                .cls-3, .cls-3 {
                  stroke-width: 0px;
                }
                .cls-3 {
                  fill: #fff;
                }
                .cls-4 {
                  fill: #ebaf00;
                }
              `}</style>
            </defs>
            <g id="plex-logo">
              <path
                id="path4"
                className="cls-3"
                d="M164.19,82.43c-39.86,0-65.54,11.49-87.16,38.51v-29.73H0v366.22s1.35.68,5.41,1.35c5.41,1.35,33.78,7.43,54.73-10.14,18.24-15.54,22.3-33.78,22.3-54.05v-52.7c22.3,23.65,47.3,33.78,82.43,33.78,75.68,0,133.78-61.49,133.78-143.24,0-88.51-56.08-150-134.46-150h0ZM149.32,306.08c-42.57,0-76.35-35.14-76.35-77.7s39.86-75.68,76.35-75.68c43.24,0,76.35,33.11,76.35,76.35s-33.78,77.03-76.35,77.03Z"
              />
              <path
                id="path6"
                className="cls-3"
                d="M408.11,223.65c0,31.76,3.38,70.27,34.46,112.16.68.68,2.03,2.7,2.03,2.7-12.84,21.62-28.38,36.49-49.32,36.49-16.22,0-32.43-8.78-45.95-23.65-14.19-16.22-20.95-37.16-20.95-59.46V0h79.05l.68,223.65Z"
              />
              <polygon
                id="polygon8"
                className="cls-4"
                points="796.62 229.05 703.38 91.22 799.32 91.22 891.89 229.05 799.32 366.22 703.38 366.22 796.62 229.05"
              />
              <polygon
                id="polygon10"
                className="cls-3"
                points="916.89 213.51 1000 91.22 904.05 91.22 869.59 141.89 916.89 213.51"
              />
              <path
                id="path12"
                className="cls-3"
                d="M869.59,316.22l16.22,22.3c15.54,24.32,35.81,36.49,59.46,36.49,25-.68,42.57-22.3,49.32-30.41,0,0-12.16-10.81-27.7-29.05-20.95-24.32-48.65-68.92-49.32-70.95l-47.97,71.62Z"
              />
              <path
                id="path16"
                className="cls-3"
                d="M632.43,287.16c-16.22,14.86-27.03,22.97-49.32,22.97-39.86,0-62.84-28.38-66.22-59.46h211.49c1.35-4.05,2.03-9.46,2.03-18.24,0-85.81-62.84-150-145.27-150s-142.57,65.54-142.57,147.3,64.19,145.27,144.59,145.27c56.08,0,104.73-31.76,131.08-87.84h-85.81ZM585.81,147.3c35.14,0,61.49,22.97,67.57,53.38h-133.78c6.76-31.76,31.76-53.38,66.22-53.38h0Z"
              />
            </g>
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
          Movie Adder
        </h1>
      </header>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="block w-full max-w-md p-3 text-lg border border-gray-300 rounded-md focus:outline-none focus:ring focus:border-blue-300 focus:dark:border-blue-900 dark:bg-gray-950 dark:border-gray-800 transition-colors"
        />
        <button
          type="submit"
          className="bg-neon-blue hover:bg-neon-blue-darker transition-colors text-white px-4 py-2 rounded-md"
        >
          Se connecter
        </button>
        {error && <p className="text-red-500 text-center text-xs font-bold">{error}</p>}
      </form>
    </div>
  );
}