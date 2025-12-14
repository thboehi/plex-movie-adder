// app/components/AddedMovies.js
"use client";

import { useState, useEffect } from "react";
import { formatDistance } from "date-fns";
import { fr } from "date-fns/locale";

export default function AddedMovies({ refreshTrigger }) {
  const [addedMovies, setAddedMovies] = useState([]);
  const [loadingAddedMovies, setLoadingAddedMovies] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const fetchAddedMovies = async () => {
      setLoadingAddedMovies(true);
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
      setLoadingAddedMovies(false);
    };

    fetchAddedMovies();
  }, [refreshTrigger]);

  return (
    <div className="w-full mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-center text-white">
        Films et séries ajoutés récemment sur Plex
      </h2>
      {loadingAddedMovies ? (
        <div className="flex flex-wrap gap-2 justify-center">
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className="relative border border-gray-800 rounded-lg overflow-hidden w-24 h-40 text-center shadow bg-gray-700"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
          </div>
        ))}
      </div>
        
      ) : addedMovies.length === 0 ? (
        <p className="text-center text-gray-400">
          Aucun film n'a encore été ajouté sur Plex.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center">
          {addedMovies.slice(0, visibleCount).map((movie) => (
            <div
              key={movie.imdbID}
              className="group border border-gray-800 rounded-lg overflow-hidden w-24 text-center shadow hover:shadow-lg hover:scale-105 transition-all bg-gray-900/50 z-10 backdrop-blur-sm"
            >
              {movie.Poster && movie.Poster !== "N/A" ? (
                <img
                  src={movie.Poster}
                  alt={movie.Title}
                  className="group w-full h-36 object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-full h-36 bg-gray-800 flex items-center justify-center text-gray-400">
                  Pas d'image
                </div>
              )}
              <div className="p-1">
                
                <h3 className="text-xs font-semibold text-white">{movie.Title}</h3>
                <p className="text-xs text-gray-400">{movie.Year}</p>
                
                <p className="text-xs text-gray-400 py-2 opacity-30 group-hover:opacity-100 transition-opacity">
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
      setVisibleCount((prev) => Math.min(prev + 10, addedMovies.length))
    }
    className="w-[98] min-h-52 bg-gray-900/50 text-white rounded-md border hover:bg-gray-800/50 border-gray-800 shadow transition-colors z-10 backdrop-blur-sm"
  >
    Voir plus<br/>
    {visibleCount} / {addedMovies.length}
  </button>
) : (
  addedMovies.length > 5 && (
    <button
      onClick={() => setVisibleCount(5)}
      className="w-[98] min-h-52 bg-gray-900 text-white rounded-md border hover:bg-gray-800 border-gray-800 shadow transition-colors"
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