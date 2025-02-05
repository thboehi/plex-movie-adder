// app/components/SearchMovies.js
"use client";

import { useState, useEffect } from "react";

const DELETE_PASSWORD = process.env.NEXT_PUBLIC_DELETE_PASSWORD;
// Ouiiii je sais qu'un dev va pouvoir trouver ce mot de passe... Et je sais que c'est risqué.. Mais les gars c'est un site entre pote non detcheu. Celui qui s'embête à venir nous enquiquiner avec ça... je le plains sincèrement et je suis désolé pour lui que sa mère ne l'ait pas assez aimée. Zbeub
const YGG_DOMAIN = process.env.NEXT_PUBLIC_YGG_DOMAIN;

export default function SearchMovies() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  // Chargement des films persistés au montage
  useEffect(() => {
    const fetchMovies = async () => {
      setLoadingMovies(true);
      try {
        const response = await fetch("/api/movies");
        if (response.ok) {
          const data = await response.json();
          setMovies(data);
        } else {
          console.error("Erreur lors du chargement des films persistés");
        }
      } catch (error) {
        console.error("Erreur lors du chargement des films :", error);
      }
      setLoadingMovies(false);
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
    if (!movies.some((m) => m.imdbID === movie.imdbID)) {
      try {
        const response = await fetch("/api/movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(movie),
        });
        if (response.ok) {
          const savedMovie = await response.json();
          setMovies((prev) => [...prev, savedMovie]);
        } else {
          console.error("Erreur lors de l'enregistrement du film");
        }
      } catch (error) {
        console.error("Erreur lors de l'enregistrement du film :", error);
      }
    }
    // Réinitialise la recherche et les résultats
    setQuery("");
    setResults([]);
  };

  // Mise à jour de handleDeleteMovie pour supprimer via l'API
  const handleDeleteMovie = async (movie) => {
    if (!authorized) {
      const enteredPassword = prompt(
        "Entrez le mot de passe pour supprimer un film :"
      );
      if (enteredPassword === DELETE_PASSWORD) {
        setAuthorized(true);
      } else {
        alert("Mot de passe incorrect");
        return;
      }
    }
    try {
      const response = await fetch(`/api/movies?imdbID=${movie.imdbID}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setMovies((prev) =>
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
    <div className="max-w-4xl mx-auto px-4 py-2 flex flex-col items-center">
      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher un film..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="block w-full max-w-md p-3 text-lg border border-gray-300 rounded-md mb-8 focus:outline-none focus:ring focus:border-blue-300 focus:dark:border-blue-900 dark:bg-gray-950 dark:border-gray-800"
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
          Films dans la liste d'attente
        </h2>
        {loadingMovies ? (
          <div className="flex justify-center items-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : movies.length === 0 ? (
          <p className="text-center text-gray-500">Aucun film dans la liste d'attente</p>
        ) : (
          <div className="flex flex-wrap gap-6 justify-center">
            {movies.map((movie) => (
              <div
                key={movie.imdbID}
                className="relative border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden w-40 text-center shadow"
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
                <button
                  onClick={() => handleDeleteMovie(movie)}
                  className="group absolute top-1 left-1 bg-red-500 opacity-10 text-white text-xs px-2 py-1 rounded transition-all hover:bg-red-600 hover:opacity-100"
                >
                  <span className="block">
                    <img src="/trash.svg" alt="Supprimer" className="w-4 h-4" />
                  </span>
                </button>

                {/* Bouton Voir plus en haut à droite */}
                <a
                  href={`https://www.imdb.com/title/${movie.imdbID}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group absolute top-1 right-1 bg-white border border-gray-300 text-gray-700 text-xs px-2 py-1 rounded transition-all hover:bg-gray-200 opacity-10 hover:opacity-100"
                >
                  <span className="block">
                    <img src="/link.svg" alt="Voir plus" className="w-4 h-4" />
                  </span>
                </a>

                {/* Bouton Recherche en bas à gauche */}
                <a
                  href={`${YGG_DOMAIN}engine/search?name=${encodeURIComponent(movie.Title)}&do=search&order=desc&sort=publish_date`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group absolute top-48 left-1 bg-white border border-gray-300 text-gray-700 text-xs px-2 py-1 rounded transition-all hover:bg-gray-200 opacity-10 hover:opacity-100"
                >
                  <span>
                    <img src="/search.svg" alt="Recherche" className="w-4 h-4" />
                  </span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}