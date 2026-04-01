// app/components/AddedMovies.js
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatDistance } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown } from "lucide-react";

export default function AddedMovies({ refreshTrigger }) {
  const [addedMovies, setAddedMovies] = useState([]);
  const [loadingAddedMovies, setLoadingAddedMovies] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

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
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="relative border border-gray-800 rounded-lg overflow-hidden h-16 bg-gray-700"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
            </div>
          ))}
        </div>
      ) : addedMovies.length === 0 ? (
        <p className="text-center text-gray-400">
          Aucun film n&apos;a encore été ajouté sur Plex.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 max-w-2xl mx-auto">
          {addedMovies.slice(0, visibleCount).map((movie, index) => {
            const movieKey = movie.tmdbID || movie.imdbID;
            const isExpanded = expandedIds.has(movieKey);

            return (
              <div
                key={movieKey}
                style={{ animation: `fadeIn 0.3s ease-out ${index * 0.03}s both` }}
                className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/30 backdrop-blur-sm hover:border-gray-700 transition-all"
              >
                {/* Ligne compacte */}
                <div
                  onClick={() => toggleExpand(movieKey)}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800/30 transition-colors"
                >
                  {/* Mini poster */}
                  <div className="relative w-9 h-[52px] shrink-0 rounded overflow-hidden">
                    {movie.Poster && movie.Poster !== "N/A" ? (
                      <Image
                        src={movie.Poster}
                        alt={movie.Title}
                        fill
                        className="object-cover"
                        sizes="36px"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
                        ?
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{movie.Title}</h3>
                    <p className="text-xs text-gray-500">
                      {movie.Year} · {movie.Type === "tv" ? "Série" : "Film"}
                    </p>
                  </div>

                  {/* Date relative */}
                  <span className="text-xs text-gray-600 shrink-0 hidden sm:block">
                    {formatDistance(new Date(movie.deleted_date), new Date(), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>

                  {/* Indicateur vert + chevron */}
                  <span className="w-2 h-2 rounded-full bg-green-500/50 shrink-0"></span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-600 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>

                {/* Détails expansés */}
                {isExpanded && (
                  <div className="px-4 pb-4 flex gap-4 border-t border-gray-800/50" style={{ animation: "fadeIn 0.2s ease-out" }}>
                    {movie.Poster && movie.Poster !== "N/A" && (
                      <div className="relative w-24 h-36 shrink-0 rounded overflow-hidden mt-3">
                        <Image
                          src={movie.Poster}
                          alt={movie.Title}
                          fill
                          className="object-cover"
                          sizes="96px"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-1 mt-3 flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-white">{movie.Title}</h4>
                      {movie.originalTitle && movie.originalTitle !== movie.Title && (
                        <p className="text-xs text-gray-500">{movie.originalTitle}</p>
                      )}
                      <p className="text-xs text-gray-400">{movie.Year} · {movie.Type === "tv" ? "Série" : "Film"}</p>
                      <p className="text-xs text-green-400 mt-1">
                        Ajouté sur Plex {formatDistance(new Date(movie.deleted_date), new Date(), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>

                      {/* Bouton IMDb */}
                      <div className="flex gap-2 mt-2">
                        {movie.imdbID && (
                          <a
                            href={`https://www.imdb.com/title/${movie.imdbID}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-imdb-yellow text-gray-800 px-2 py-1 rounded font-bold hover:opacity-80 transition-opacity"
                          >
                            IMDb
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Boutons voir plus / réduire */}
          {addedMovies.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((prev) => Math.min(prev + 15, addedMovies.length))}
              className="mt-2 py-2 text-sm text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 rounded-lg bg-gray-900/30 backdrop-blur-sm transition-colors"
            >
              Voir plus · {visibleCount} / {addedMovies.length}
            </button>
          )}
          {addedMovies.length <= visibleCount && addedMovies.length > 10 && (
            <button
              onClick={() => setVisibleCount(10)}
              className="mt-2 py-2 text-sm text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 rounded-lg bg-gray-900/30 backdrop-blur-sm transition-colors"
            >
              Réduire
            </button>
          )}
        </div>
      )}
    </div>
  );
}