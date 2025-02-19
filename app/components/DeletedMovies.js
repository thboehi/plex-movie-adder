// app/components/AddedMovies.js
"use client";

import { useState, useEffect } from "react";
import { formatDistance } from "date-fns";
import { fr } from "date-fns/locale";

export default function DeletedMovies() {
  const [movies, setMovies] = useState([]);
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
          setMovies(sortedData);
        } else {
          console.error("Erreur lors du chargement des films ajoutés");
        }
      } catch (error) {
        console.error("Erreur lors du chargement des films ajoutés :", error);
      }
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
        <div className="flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : movies.length === 0 ? (
        <p className="text-center text-gray-500">
          Aucun film n'a encore été ajouté sur Plex.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {movies.slice(0, visibleCount).map((movie) => (
            <div
              key={movie.imdbID}
              className="group border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden w-24 text-center shadow hover:scale-105 transition-transform"
            >
              {movie.Poster && movie.Poster !== "N/A" ? (
                <img
                  src={movie.Poster}
                  alt={movie.Title}
                  className="w-full h-36 object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-full h-36 bg-gray-200 flex items-center justify-center">
                  Pas d'image
                </div>
              )}
              <div className="p-1">
                <p className="text-xs text-gray-500 py-2">
                    Ajouté{" "}
                    {formatDistance(new Date(movie.deleted_date), new Date(), {
                      addSuffix: true,
                      locale: fr,
                    })}
                </p>
                <h3 className="text-xs font-semibold">{movie.Title}</h3>
                <p className="text-xs text-gray-500">{movie.Year}</p>
                
              </div>
            </div>
          ))}
          
          {movies.length > visibleCount ? (
  <button
    onClick={() =>
      setVisibleCount((prev) => Math.min(prev + 10, movies.length))
    }
    className="p-6 bg-gray-200 text-black rounded-md border hover:bg-gray-300 border-gray-300 dark:bg-gray-950 dark:text-white dark:border-gray-800 dark:hover:bg-gray-900 shadow transition-colors"
  >
    Afficher<br />plus
  </button>
) : (
  movies.length > 5 && (
    <button
      onClick={() => setVisibleCount(5)}
      className="p-6 bg-gray-200 text-black rounded-md border hover:bg-gray-300 border-gray-300 dark:bg-gray-950 dark:text-white dark:border-gray-800 dark:hover:bg-gray-900 shadow transition-colors"
    >
      Cacher
    </button>
  )
)}


        </div>
      )}
    </div>
  );
}