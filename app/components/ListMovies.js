// app/components/ListMovies.js
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// Lazy loading des composants Material Tailwind (uniquement pour le modal)
const Select = dynamic(() => import("@material-tailwind/react").then(mod => mod.Select), { ssr: false });
const Option = dynamic(() => import("@material-tailwind/react").then(mod => mod.Option), { ssr: false });
const Typography = dynamic(() => import("@material-tailwind/react").then(mod => mod.Typography), { ssr: false });

const YGG_DOMAIN = process.env.NEXT_PUBLIC_YGG_DOMAIN;

export default function ListMovies( { adminAuthenticated, onMovieDeleted } ) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [listMovies, setListMovies] = useState([]);
  const [loadingListMovies, setLoadingListMovies] = useState(true);
  const [loading, setLoading] = useState(false);
  

  // Chargement des films persistés au montage avec cache localStorage
  useEffect(() => {
    const CACHE_KEY = 'plex_movies_cache';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    
    const fetchMovies = async () => {
      // 1. Essayer de charger depuis le cache
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { movies, timestamp } = JSON.parse(cachedData);
          const now = Date.now();
          
          // Si le cache est récent (< 5 min), l'afficher immédiatement
          if (now - timestamp < CACHE_DURATION) {
            setListMovies(movies);
            setLoadingListMovies(false);
            // Continue quand même à revalider en arrière-plan
          }
        }
      } catch (error) {
        console.error("Erreur cache localStorage:", error);
      }
      
      // 2. Récupérer les données fraîches
      try {
        const response = await fetch("/api/movies");
        if (response.ok) {
          const data = await response.json();
          setListMovies(data);
          
          // 3. Mettre à jour le cache
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              movies: data,
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error("Erreur sauvegarde cache:", error);
          }
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

  // Recherche avec debounce et AbortController
  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
      fetch(`https://www.omdbapi.com/?apikey=a2ca920d&s=${query}`, {
        signal: controller.signal
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.Search) {
            setResults(data.Search);
          } else {
            setResults([]);
          }
        })
        .catch((err) => {
          // Ne pas logger les erreurs d'annulation
          if (err.name !== 'AbortError') {
            console.error("Erreur lors de l'appel à l'API OMDb:", err);
          }
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort(); // Annule la requête en cours
    };
  }, [query]);

  // Optimistic update : ajout immédiat du film dans l'UI
  const handleAddMovie = async (movie) => {
    // Si le film n'est pas déjà présent
    if (listMovies.some((m) => m.imdbID === movie.imdbID)) {
      return;
    }

    // 1. Ajout optimiste - le film apparaît IMMÉDIATEMENT
    const optimisticMovie = {
      ...movie,
      _optimistic: true, // Marqueur pour l'affichage
      deleted: false,
      added_date: new Date()
    };
    
    setListMovies((prev) => [...prev, optimisticMovie]);
    setQuery("");
    setResults([]);

    // 2. Sauvegarde en arrière-plan
    try {
      const response = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movie),
      });
      
      if (response.ok) {
        const savedMovie = await response.json();
        // Remplacer le film optimiste par le film confirmé
        setListMovies((prev) => {
          const updatedMovies = prev.map((m) =>
            m.imdbID === movie.imdbID && m._optimistic ? savedMovie : m
          );
          
          // Mettre à jour le cache localStorage
          try {
            localStorage.setItem('plex_movies_cache', JSON.stringify({
              movies: updatedMovies,
              timestamp: Date.now()
            }));
          } catch (error) {
            console.error("Erreur mise à jour cache:", error);
          }
          
          return updatedMovies;
        });
      } else {
        // En cas d'erreur, retirer le film optimiste
        console.error("Erreur lors de l'enregistrement du film");
        setListMovies((prev) => prev.filter((m) => m.imdbID !== movie.imdbID));
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du film :", error);
      // Retirer le film optimiste en cas d'erreur réseau
      setListMovies((prev) => prev.filter((m) => m.imdbID !== movie.imdbID));
    }
  };

  // Optimistic update : suppression immédiate de l'UI
  const handleDeleteMovie = async (movie) => {
    if (!adminAuthenticated) {
      alert("Vous devez être admin pour supprimer un film");
      return;
    }
    
    // 1. Suppression optimiste - disparaît IMMÉDIATEMENT
    const previousMovies = listMovies;
    const updatedMovies = listMovies.filter((m) => m.imdbID !== movie.imdbID);
    setListMovies(updatedMovies);
    
    // 2. Confirmation en arrière-plan
    try {
      const response = await fetch(`/api/movies?imdbID=${movie.imdbID}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        // Mettre à jour le cache localStorage
        try {
          localStorage.setItem('plex_movies_cache', JSON.stringify({
            movies: updatedMovies,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error("Erreur mise à jour cache:", error);
        }
        // Déclencher le refresh de la liste des films ajoutés
        if (onMovieDeleted) {
          onMovieDeleted();
        }
      } else if (!response.ok) {
        // En cas d'erreur, restaurer le film
        console.error("Erreur lors de la suppression du film");
        setListMovies(previousMovies);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du film :", error);
      // Restaurer en cas d'erreur réseau
      setListMovies(previousMovies);
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
        className="block w-full max-w-xl p-3 text-lg border border-gray-800 rounded-md mb-8 outline-none focus:border-orange focus:ring-2 focus:ring-orange hover:border-orange bg-gray-900/50 z-10 backdrop-blur-sm text-white transition-colors"
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
              <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            results.length > 0 && (
              <motion.div 
                className="flex flex-wrap gap-4 justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence mode="popLayout">
                  {results.map((movie, index) => (
                    <motion.div
                      key={movie.imdbID}
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ 
                        duration: 0.3,
                        delay: index * 0.05, // Stagger effect
                        ease: "easeOut"
                      }}
                      onClick={() => handleAddMovie(movie)}
                      className="cursor-pointer border border-gray-800 rounded-lg overflow-hidden w-32 text-center shadow transition-all duration-200 hover:scale-105 hover:border-orange hover:shadow-lg bg-gray-900/50 z-10 backdrop-blur-sm"
                    >
                      {movie.Poster && movie.Poster !== "N/A" ? (
                        <div className="relative w-full h-44">
                          <Image
                            src={movie.Poster}
                            alt={movie.Title}
                            fill
                            className="object-cover"
                            sizes="128px"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-44 bg-gray-800 flex items-center justify-center text-gray-400">
                          Pas d&apos;image
                        </div>
                      )}
                      <div className="p-2">
                        <h3 className="text-sm font-semibold text-white">{movie.Title}</h3>
                        <p className="text-xs text-gray-400">{movie.Year}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )
          )}
        </div>
      )}

      {/* Section des films ajoutés */}
      <div className="w-full">
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Films et séries dans la liste d&apos;attente
        </h2>
        {loadingListMovies ? (
          <div className="flex flex-wrap gap-3 justify-center">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="relative border border-gray-800 rounded-lg overflow-hidden w-40 text-center shadow"
              >
                {/* Image skeleton */}
                <div className="relative w-full h-56 bg-gray-700 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                </div>
                {/* Text skeleton */}
                <div className="p-2 space-y-2">
                  <div className="h-4 bg-gray-700 rounded mx-auto w-24 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                  </div>
                  <div className="h-3 bg-gray-700 rounded mx-auto w-12 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : listMovies.length === 0 ? (
          <p className="text-center text-gray-400">Aucun film dans la liste d&apos;attente</p>
        ) : (
          <motion.div 
            className="flex flex-wrap gap-3 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <AnimatePresence mode="popLayout">
              {listMovies.map((movie, index) => (
                <motion.div
                  key={movie.imdbID}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ 
                    opacity: movie._optimistic ? 0.6 : 1, // Film en cours d'ajout légèrement transparent
                    scale: 1, 
                    y: 0 
                  }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.03,
                    layout: { duration: 0.3 }
                  }}
                  className="relative border border-gray-800 rounded-lg overflow-hidden w-40 text-center shadow transition-all hover:scale-105 hover:shadow-xl bg-gray-900/50 z-10 backdrop-blur-sm"
                >
                  {movie.Poster && movie.Poster !== "N/A" ? (
                    <div className="relative w-full h-56">
                      <Image
                        src={movie.Poster}
                        alt={movie.Title}
                        fill
                        className="object-cover"
                        sizes="160px"
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjIyNCIgZmlsbD0iI2UwZTBlMCIvPjwvc3ZnPg=="
                      />
                    </div>
                  ) : (
                    <div className="w-full h-56 bg-gray-800 flex items-center justify-center text-gray-400">
                      Pas d&apos;image
                    </div>
                  )}
                  <div className="p-2">
                    <h3 className="text-base font-semibold text-white">{movie.Title}</h3>
                    <p className="text-sm text-gray-400">{movie.Year}</p>
                  </div>
                {/* Indicateur "Ajouté" en haut à droite */}
                {adminAuthenticated && (
                  <button
                  onClick={() => handleDeleteMovie(movie)}
                  className="group absolute top-2 -right-2 hover:right-0 bg-green-500 opacity-20 text-white text-xs p-2 rounded-l transition-all hover:w-3/4 hover:bg-green-600 hover:opacity-100"
                >
                  <span className="block group-hover:hidden">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="hidden group-hover:block" style={{fontSize: 10, fontWeight: 700}}>Marquer comme ajouté</span>
                </button>
                )}
                

                {/* Bouton Voir plus en haut à droite */}
                <a
                  href={`https://www.imdb.com/title/${movie.imdbID}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group absolute top-2 -left-2 hover:left-0 bg-imdb-yellow text-gray-700 text-xs p-2 rounded-r transition-all opacity-10 hover:w-3/4 hover:opacity-100"
                >
                  <span className="block group-hover:hidden">
                    <Image src="/link.svg" alt="Voir plus" width={16} height={16} />
                  </span>
                  <span className="hidden group-hover:block" style={{fontSize: 10, fontWeight: 900}}>Voir la fiche IMDb</span>
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
                        <Image src="/search.svg" alt="Recherche" width={16} height={16} />
                      </span>
                      <span className="hidden group-hover:block" style={{fontSize: 10, fontWeight: 700}}>Rechercher sur YGG</span>
                    </a>
                  );
                })()}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
}