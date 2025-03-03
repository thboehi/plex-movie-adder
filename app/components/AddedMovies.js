// app/components/AddedMovies.js
"use client";

import { useState, useEffect } from "react";
import { formatDistance } from "date-fns";
import { fr } from "date-fns/locale";

export default function AddedMovies() {
  const [addedMovies, setAddedMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const fetchAddedMovies = async () => {
      setLoadingMovies(true);
      try {
        const response = await fetch("/api/movies/deleted");
        if (response.ok) {
          const data = await response.json();
          const sortedData = data.sort((a, b) => new Date(b.deleted_date) - new Date(a.deleted_date));
          setAddedMovies(sortedData);
        } else {
          console.error("Erreur lors du chargement des films ajoutés");
        }
      } catch (error) {
        console.error("Erreur lors du chargement des films ajoutés :", error);
      }
      // On simule un chargement long pour voir l'animation de chargement
      setLoadingMovies(false);
    };

    fetchAddedMovies();
  }, []);

  return (
    <div className="w-full mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Films et séries ajoutés récemment sur Plex
      </h2>
      {loadingMovies ? (
        <div className="flex flex-wrap gap-2 justify-center">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="relative border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden w-24 h-40 text-center shadow bg-gray-200 dark:bg-gray-700"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
          </div>
        ))}
      </div>
        
      ) : addedMovies.length === 0 ? (
        <p className="text-center text-gray-500">
          Aucun film n'a encore été ajouté sur Plex.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {addedMovies.slice(0, visibleCount).map((movie) => (
            <div
              key={movie.imdbID}
              className="group border border-gray-300 dark:border-gray-800 hover:border-blue-300 hover:dark:border-blue-900 rounded-lg overflow-hidden w-24 text-center shadow hover:scale-105 transition-transform"
            >
              {movie.Poster && movie.Poster !== "N/A" ? (
                <img
                  src={movie.Poster}
                  alt={movie.Title}
                  className="group w-full h-36 object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-full h-36 bg-gray-200 flex items-center justify-center">
                  Pas d'image
                </div>
              )}
              <div className="p-1">
                
                <h3 className="text-xs font-semibold">{movie.Title}</h3>
                <p className="text-xs text-gray-500">{movie.Year}</p>
                
                <p className="text-xs text-gray-500 py-2 opacity-30 group-hover:opacity-100 transition-opacity">
                    Ajouté{" "}
                    {formatDistance(new Date(movie.deleted_date), new Date(), {
                      addSuffix: true,
                      locale: fr,
                    })}
                </p>
                
              </div>
            </div>
          ))}
          
          {addedMovies.length > visibleCount ? (
  <button
    onClick={() =>
      setVisibleCount((prev) => Math.min(prev + 5, addedMovies.length))
    }
    className="p-6 min-h-52 bg-gray-200 text-black rounded-md border hover:bg-gray-300 border-gray-300 dark:bg-gray-950 dark:text-white dark:border-gray-800 dark:hover:bg-gray-900 shadow transition-colors"
  >
    Voir plus<br/>
    {visibleCount} / {addedMovies.length}
  </button>
) : (
  addedMovies.length > 5 && (
    <button
      onClick={() => setVisibleCount(5)}
      className="p-6 min-h-52 bg-gray-200 text-black rounded-md border hover:bg-gray-300 border-gray-300 dark:bg-gray-950 dark:text-white dark:border-gray-800 dark:hover:bg-gray-900 shadow transition-colors"
    >
      Réduire
    </button>
  )
)}


        </div>
      )}
    </div>
  );
}