// app/components/ListMovies.js
"use client";

import { useState, useEffect } from "react";

const DELETE_PASSWORD = process.env.NEXT_PUBLIC_DELETE_PASSWORD;
// Ouiiii je sais qu'un dev va pouvoir trouver ce mot de passe... Et je sais que c'est risqué.. Mais les gars c'est un site entre pote non detcheu. Celui qui s'embête à venir nous enquiquiner avec ça... je le plains sincèrement et je suis désolé pour lui que sa mère ne l'ait pas assez aimée. Zbeub
const YGG_DOMAIN = process.env.NEXT_PUBLIC_YGG_DOMAIN;

export default function ListMovies( { adminAuthenticated } ) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [listMovies, setListMovies] = useState([]);
  const [loadingListMovies, setLoadingListMovies] = useState(true);
  const [loading, setLoading] = useState(false);
  const [addingMovie, setAddingMovie] = useState(false);

  // Attendre 3 secondes avant de log dans la console
  setTimeout(() => {
    console.log("adminAuthenticated : ", adminAuthenticated);
  }, 3000);
  

  // Chargement des films persistés au montage
  useEffect(() => {
    const fetchMovies = async () => {
      setLoadingListMovies(true);
      try {
        const response = await fetch("/api/movies");
        if (response.ok) {
          const data = await response.json();
          setListMovies(data);
        } else {
          console.error("Erreur lors du chargement des films persistés");
        }
      } catch (error) {
        console.error("Erreur lors du chargement des films :", error);
      }
      setLoadingListMovies(false);
    };
  
    fetchMovies();
  }, []);

  // Recherche avec debounce
  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(() => {
      fetch(`https://www.omdbapi.com/?apikey=a2ca920d&s=${query}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.Search) {
            setResults(data.Search);
          } else {
            setResults([]);
          }
        })
        .catch((err) =>
          console.error("Erreur lors de l'appel à l'API OMDb:", err)
        )
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Mise à jour de handleAddMovie pour persister via l'API
  const handleAddMovie = async (movie) => {
    // Si le film n'est pas déjà présent
    if (!listMovies.some((m) => m.imdbID === movie.imdbID)) {
      setAddingMovie(true); // Active l'overlay de chargement
      try {
        const response = await fetch("/api/movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(movie),
        });
        if (response.ok) {
          const savedMovie = await response.json();
          setListMovies((prev) => [...prev, savedMovie]);
        } else {
          console.error("Erreur lors de l'enregistrement du film");
        }
      } catch (error) {
        console.error("Erreur lors de l'enregistrement du film :", error);
      }
    }
    setAddingMovie(false); // Désactive l'overlay une fois terminé
    // Réinitialise la recherche et les résultats
    setQuery("");
    setResults([]);
  };

  // Mise à jour de handleDeleteMovie pour supprimer via l'API
  const handleDeleteMovie = async (movie) => {
    if (!adminAuthenticated) {
      alert("Vous devez être admin pour supprimer un film");
      return;
    }
    try {
      const response = await fetch(`/api/movies?imdbID=${movie.imdbID}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setListMovies((prev) =>
          prev.filter((m) => m.imdbID !== movie.imdbID)
        );
      } else {
        console.error("Erreur lors de la suppression du film");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du film :", error);
    }
  };

  return (
    <>
    <div className="mx-auto flex flex-col items-center">
      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher un film..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full max-w-md p-3 text-lg border border-gray-300 rounded-md mb-8 outline-none focus:border-blue-300 focus:ring-2 hover:border-blue-300 hover:dark:border-blue-900 focus:dark:border-blue-900 dark:bg-gray-950 dark:border-gray-800 transition-colors"
      />

      {/* Section des résultats de recherche */}
      {query && (
        <div className="w-full mb-12">
          <h2 className="text-xl font-semibold text-center mb-4">
            Résultats de recherche
          </h2>
          {loading ? (
            <div className="flex justify-center items-center">
              {/* Demi rond stylisé qui tourne */}
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            results.length > 0 && (
              <div className="flex flex-wrap gap-4 justify-center">
                {results.map((movie) => (
                  <div
                    key={movie.imdbID}
                    onClick={() => handleAddMovie(movie)}
                    className="cursor-pointer border border-gray-300 rounded-lg overflow-hidden w-32 text-center shadow transition-transform duration-200 hover:scale-105 hover:shadow-lg"
                  >
                    {movie.Poster && movie.Poster !== "N/A" ? (
                      <img
                        src={movie.Poster}
                        alt={movie.Title}
                        className="w-full h-44 object-cover"
                      />
                    ) : (
                      <div className="w-full h-44 bg-gray-200 flex items-center justify-center">
                        Pas d'image
                      </div>
                    )}
                    <div className="p-2">
                      <h3 className="text-sm font-semibold">{movie.Title}</h3>
                      <p className="text-xs text-gray-500">{movie.Year}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Section des films ajoutés */}
      <div className="w-full">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Films et séries dans la liste d'attente
        </h2>
        {loadingListMovies ? (
          <div className="flex flex-wrap gap-6 justify-center">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="relative border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden w-40 h-64 text-center shadow bg-gray-200 dark:bg-gray-700"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
              </div>
            ))}
          </div>
        ) : listMovies.length === 0 ? (
          <p className="text-center text-gray-500">Aucun film dans la liste d'attente</p>
        ) : (
          <div className="flex flex-wrap gap-6 justify-center">
            {listMovies.map((movie) => (
              <div
                key={movie.imdbID}
                className="relative border border-gray-300 dark:border-gray-800 hover:border-blue-300 hover:dark:border-blue-900 rounded-lg overflow-hidden w-40 text-center shadow transition-all hover:scale-105"
              >
                {movie.Poster && movie.Poster !== "N/A" ? (
                  <img
                    src={movie.Poster}
                    alt={movie.Title}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className="w-full h-56 bg-gray-200 flex items-center justify-center">
                    Pas d'image
                  </div>
                )}
                <div className="p-2">
                  <h3 className="text-base font-semibold">{movie.Title}</h3>
                  <p className="text-sm text-gray-500">{movie.Year}</p>
                </div>
                {/* Bouton Supprimer en haut à gauche */}
                {adminAuthenticated && (
                  <button
                  onClick={() => handleDeleteMovie(movie)}
                  className="group absolute top-2 -right-2 hover:right-0 bg-red-500 opacity-10 text-white text-xs p-2 rounded-l transition-all hover:bg-red-600 hover:opacity-100"
                >
                  <span className="block">
                    <img src="/trash.svg" alt="Supprimer" className="w-4 h-4" />
                  </span>
                </button>
                )}
                

                {/* Bouton Voir plus en haut à droite */}
                <a
                  href={`https://www.imdb.com/title/${movie.imdbID}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group absolute top-2 -left-2 hover:left-0 bg-imdb-yellow text-gray-700 text-xs p-2 rounded-r transition-all opacity-10 hover:opacity-100"
                >
                  <span className="block group-hover:hidden">
                    <img src="/link.svg" alt="Voir plus" className="w-4 h-4" />
                  </span>
                  <span className="hidden group-hover:block" style={{fontSize: 10, fontWeight: 900}}>IMDb</span>
                </a>

                {/* Bouton Recherche en bas à gauche */}
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const movieYear = parseInt(movie.Year, 10);
                  const sortParam =
                    movieYear >= currentYear - 1
                      ? "&do=search&order=desc&sort=publish_date"
                      : "&do=search&order=desc&sort=completed";
                  return (
                    <a
                      href={`${YGG_DOMAIN}engine/search?name=${encodeURIComponent(
                        movie.Title
                      )}${sortParam}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group absolute top-12 -left-2 hover:left-0 bg-ygg-blue text-gray-700 text-xs p-2 rounded-r transition-all opacity-30 hover:opacity-100"
                    >
                      <span className="block group-hover:hidden">
                        <img src="/search.svg" alt="Recherche" className="w-4 h-4" />
                      </span>
                      <span className="hidden group-hover:block" style={{fontSize: 10, fontWeight: 700}}>YGG</span>
                    </a>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    {addingMovie && (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
        <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full"></div>
      </div>
    )}
    </>
  );
}