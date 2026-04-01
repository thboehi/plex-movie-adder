// app/components/ListMovies.js
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Waves, ChevronDown } from "lucide-react";

export default function ListMovies( { adminAuthenticated, onMovieDeleted } ) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [listMovies, setListMovies] = useState([]);
  const [loadingListMovies, setLoadingListMovies] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [expandedDeep, setExpandedDeep] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null); // movie to confirm delete in deep waitlist
  

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

  // Recherche via TMDB avec debounce et AbortController
  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setResults(data);
          } else {
            setResults([]);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            console.error("Erreur lors de la recherche:", err);
          }
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);



  // Optimistic update : ajout immédiat du film dans l'UI
  const handleAddMovie = async (movie, deepWaitlist = false) => {
    // Si le film n'est pas déjà présent
    if (listMovies.some((m) => m.tmdbID === movie.tmdbID)) {
      return;
    }

    // 1. Ajout optimiste - le film apparaît IMMÉDIATEMENT
    const optimisticMovie = {
      ...movie,
      deep_waitlist: deepWaitlist,
      _optimistic: true,
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
        body: JSON.stringify({
          tmdbID: movie.tmdbID,
          Title: movie.Title,
          originalTitle: movie.originalTitle,
          Year: movie.Year,
          Poster: movie.Poster,
          Type: movie.Type,
          deep_waitlist: deepWaitlist,
        }),
      });
      
      if (response.ok) {
        const savedMovie = await response.json();
        setListMovies((prev) => {
          const updatedMovies = prev.map((m) =>
            m.tmdbID === movie.tmdbID && m._optimistic ? savedMovie : m
          );
          
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
        console.error("Erreur lors de l'enregistrement du film");
        setListMovies((prev) => prev.filter((m) => m.tmdbID !== movie.tmdbID));
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du film :", error);
      setListMovies((prev) => prev.filter((m) => m.tmdbID !== movie.tmdbID));
    }
  };

  // Optimistic update : suppression immédiate de l'UI
  const handleDeleteMovie = async (movie) => {
    if (!adminAuthenticated) {
      alert("Vous devez être admin pour supprimer un film");
      return;
    }
    
    const movieId = movie.tmdbID || movie.imdbID;
    
    // 1. Suppression optimiste
    const previousMovies = listMovies;
    const updatedMovies = listMovies.filter((m) => (m.tmdbID || m.imdbID) !== movieId);
    setListMovies(updatedMovies);
    
    // 2. Confirmation en arrière-plan
    try {
      const deleteParam = movie.tmdbID ? `tmdbID=${movie.tmdbID}` : `imdbID=${movie.imdbID}`;
      const response = await fetch(`/api/movies?${deleteParam}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        try {
          localStorage.setItem('plex_movies_cache', JSON.stringify({
            movies: updatedMovies,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error("Erreur mise à jour cache:", error);
        }
        if (onMovieDeleted) {
          onMovieDeleted();
        }
      } else {
        console.error("Erreur lors de la suppression du film");
        setListMovies(previousMovies);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du film :", error);
      setListMovies(previousMovies);
    }
  };

  // Déplacer un film dans les abysses (deep waitlist)
  const handleMoveToDeep = async (movie) => {
    const movieKey = movie.tmdbID || movie.imdbID;

    // Optimistic update
    setListMovies((prev) =>
      prev.map((m) =>
        (m.tmdbID || m.imdbID) === movieKey ? { ...m, deep_waitlist: true } : m
      )
    );

    try {
      const body = { deep_waitlist: true };
      if (movie.tmdbID) body.tmdbID = movie.tmdbID;
      else if (movie.imdbID) body.imdbID = movie.imdbID;

      const response = await fetch("/api/movies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const updatedMovie = await response.json();
        setListMovies((prev) => {
          const updatedMovies = prev.map((m) =>
            (m.tmdbID || m.imdbID) === movieKey ? updatedMovie : m
          );
          try {
            localStorage.setItem('plex_movies_cache', JSON.stringify({ movies: updatedMovies, timestamp: Date.now() }));
          } catch (e) { console.error("Erreur cache:", e); }
          return updatedMovies;
        });
      } else {
        // Rollback
        setListMovies((prev) =>
          prev.map((m) =>
            (m.tmdbID || m.imdbID) === movieKey ? { ...m, deep_waitlist: false } : m
          )
        );
      }
    } catch (error) {
      console.error("Erreur déplacement abysses:", error);
      setListMovies((prev) =>
        prev.map((m) =>
          (m.tmdbID || m.imdbID) === movieKey ? { ...m, deep_waitlist: false } : m
        )
      );
    }
  };

  // Ouvrir le modal d'édition de note
  const handleEditNote = (movie) => {
    setEditingNote(movie.tmdbID || movie.imdbID);
    setNoteText(movie.admin_note || "");
  };

  // Sauvegarder la note
  const handleSaveNote = async (movie) => {
    try {
      const body = { admin_note: noteText.trim() || null };
      if (movie.tmdbID) body.tmdbID = movie.tmdbID;
      else if (movie.imdbID) body.imdbID = movie.imdbID;

      const response = await fetch("/api/movies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const updatedMovie = await response.json();
        setListMovies((prev) => {
          const updatedMovies = prev.map((m) => {
            const mId = m.tmdbID || m.imdbID;
            const movieId = movie.tmdbID || movie.imdbID;
            return mId === movieId ? updatedMovie : m;
          });
          
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
        setEditingNote(null);
        setNoteText("");
      } else {
        console.error("Erreur lors de la sauvegarde de la note");
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la note:", error);
    }
  };

  // Basculer l'affichage de la note
  const toggleFlip = (id) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle expanded state for deep waitlist items
  const toggleDeepExpand = (id) => {
    setExpandedDeep((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Helper pour obtenir l'URL Torr9
  const getTorr9Url = (movie) => {
    const isTV = movie.Type === "tv" || movie.Type === "series";
    const mode = isTV ? "tv" : "movie";
    const category = isTV ? "tv" : "film";
    const currentYear = new Date().getFullYear();
    const movieYear = parseInt(movie.Year, 10);
    const sortBy = movieYear >= currentYear - 1 ? "created_at" : "times_completed";
    return `https://torr9.net/search?mode=${mode}&category=${category}&tmdb_id=${movie.tmdbID || ''}&sort_by=${sortBy}&order=desc`;
  };

  // Séparer les films normaux et deep waitlist
  const normalMovies = listMovies.filter((m) => !m.deep_waitlist);
  const deepMovies = listMovies.filter((m) => m.deep_waitlist);

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
              <div className="w-12 h-12 border-4 border-orange border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            results.length > 0 && (
              <div className="flex flex-wrap gap-4 justify-center">
                {results.map((movie, index) => (
                  <div
                    key={movie.tmdbID}
                    className="relative"
                    style={{
                      animation: `fadeIn 0.5s ease-out ${index * 0.05}s both`
                    }}
                  >
                    <div
                      onClick={() => handleAddMovie(movie, false)}
                      className="cursor-pointer border border-gray-800 rounded-lg overflow-hidden w-32 text-center shadow transition-all duration-200 hover:scale-105 hover:border-orange hover:shadow-lg bg-gray-900/50 z-10 backdrop-blur-sm"
                    >
                      {movie.Poster ? (
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
                        <p className="text-xs text-gray-400">{movie.Year} · {movie.Type === "tv" ? "Série" : "Film"}</p>
                      </div>
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
          Films et séries dans la liste d&apos;attente
        </h2>
        {loadingListMovies ? (
          <div className="flex flex-wrap gap-4 justify-center">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="relative border border-gray-800 rounded-lg overflow-hidden w-44 text-center shadow"
              >
                <div className="relative w-full h-60 bg-gray-700 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                </div>
                <div className="p-2.5 space-y-2">
                  <div className="h-4 bg-gray-700 rounded mx-auto w-28 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                  </div>
                  <div className="h-3 bg-gray-700 rounded mx-auto w-14 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 animate-[shimmer_1.5s_infinite]"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : normalMovies.length === 0 ? (
          <p className="text-center text-gray-400">Aucun film dans la liste d&apos;attente</p>
        ) : (
          <div className="flex flex-wrap gap-4 justify-center">
            {normalMovies.map((movie, index) => {
              const movieKey = movie.tmdbID || movie.imdbID;
              const isFlipped = flippedCards.has(movieKey);
              const hasNote = movie.admin_note && movie.admin_note.trim();
              
              return (
              <div
                key={movieKey}
                style={{
                  animation: `fadeIn 0.6s ease-in-out ${index * 0.03}s both`,
                  opacity: movie._optimistic ? 0.5 : 1,
                  transition: 'opacity 0.6s ease-in-out'
                }}
                className="relative w-44 text-center"
              >
                <div 
                  className="relative w-full h-[21rem] transition-transform duration-700 preserve-3d"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.7s cubic-bezier(0.4, 0.0, 0.2, 1)'
                  }}
                >
                  {/* Face avant */}
                  <div 
                    className="absolute inset-0 backface-hidden border border-gray-800 hover:border-gray-600 rounded-lg overflow-hidden shadow transition-all hover:shadow-xl hover:shadow-black/20 bg-gray-900/50 backdrop-blur-sm group"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden'
                    }}
                  >
                      {movie.Poster && movie.Poster !== "N/A" ? (
                        <div className="relative w-full h-60">
                          <Image
                            src={movie.Poster}
                            alt={movie.Title}
                            fill
                            className="object-cover"
                            sizes="176px"
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjIyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjIyNCIgZmlsbD0iI2UwZTBlMCIvPjwvc3ZnPg=="
                          />
                          {/* Gradient overlay bas */}
                          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
                        </div>
                      ) : (
                        <div className="w-full h-60 bg-gray-800 flex items-center justify-center text-gray-400">
                          Pas d&apos;image
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-white leading-tight truncate">{movie.Title}</h3>
                        {movie.originalTitle && movie.originalTitle !== movie.Title && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">{movie.originalTitle}</p>
                        )}
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                            {movie.Type === "tv" ? "Série" : "Film"}
                          </span>
                          <span className="text-xs text-gray-400">{movie.Year}</span>
                        </div>
                      </div>

                      {/* Boutons admin */}
                      {adminAuthenticated && (
                        <>
                          <button
                            onClick={() => handleDeleteMovie(movie)}
                            className="group/btn absolute top-2 -right-2 hover:right-0 bg-green-500 opacity-20 text-white text-xs p-2 rounded-l transition-all hover:w-3/4 hover:bg-green-600 hover:opacity-100 z-10"
                          >
                            <span className="block group-hover/btn:hidden">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                            <span className="hidden group-hover/btn:block" style={{fontSize: 10, fontWeight: 700}}>Ajouté</span>
                          </button>
                          
                          <button
                            onClick={() => handleEditNote(movie)}
                            className="group/btn absolute top-12 -right-2 hover:right-0 bg-blue-500 opacity-20 text-white text-xs p-2 rounded-l transition-all hover:w-3/4 hover:bg-blue-600 hover:opacity-100 z-10"
                          >
                            <span className="block group-hover/btn:hidden">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                            <span className="hidden group-hover/btn:block" style={{fontSize: 10, fontWeight: 700}}>Note</span>
                          </button>

                          <a
                            href={getTorr9Url(movie)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/btn absolute top-[5.5rem] -right-2 hover:right-0 text-white text-xs p-2 rounded-l transition-all opacity-30 hover:w-3/4 hover:opacity-100 z-10"
                            style={{ backgroundColor: 'lab(67.805% -35.3952 -30.2018)' }}
                          >
                            <span className="block group-hover/btn:hidden">
                              <Image src="/search.svg" alt="Recherche" width={16} height={16} />
                            </span>
                            <span className="hidden group-hover/btn:block" style={{ fontSize: 10, fontWeight: 700 }}>
                              Rechercher sur Torr9
                            </span>
                          </a>

                          <button
                            onClick={() => handleMoveToDeep(movie)}
                            className="group/btn absolute top-[8.5rem] -right-2 hover:right-0 bg-blue-500 opacity-20 text-white text-xs p-2 rounded-l transition-all hover:w-3/4 hover:bg-blue-600 hover:opacity-100 z-10"
                          >
                            <span className="block group-hover/btn:hidden">
                              <Waves size={16} />
                            </span>
                            <span className="hidden group-hover/btn:block" style={{fontSize: 10, fontWeight: 700}}>Abysses</span>
                          </button>
                        </>
                      )}

                      {/* Bouton IMDb */}
                      {movie.imdbID && (
                        <a
                          href={`https://www.imdb.com/title/${movie.imdbID}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/btn absolute top-2 -left-2 hover:left-0 bg-imdb-yellow text-gray-700 text-xs p-2 rounded-r transition-all opacity-10 hover:w-3/4 hover:opacity-100 z-10"
                        >
                          <span className="block group-hover/btn:hidden">
                            <Image src="/link.svg" alt="Voir plus" width={16} height={16} />
                          </span>
                          <span className="hidden group-hover/btn:block" style={{fontSize: 10, fontWeight: 900}}>Voir la fiche IMDb</span>
                        </a>
                      )}

                      {/* Bouton Note */}
                      {hasNote && (
                        <button
                          onClick={() => toggleFlip(movieKey)}
                          className="group/btn absolute top-12 -left-2 hover:left-0 bg-purple-500 text-white text-xs p-2 rounded-r transition-all opacity-30 hover:w-3/4 hover:opacity-100 z-10"
                        >
                          <span className="block group-hover/btn:hidden">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                          <span className="hidden group-hover/btn:block" style={{fontSize: 10, fontWeight: 700}}>Note</span>
                        </button>
                      )}
                  </div>

                  {/* Face arrière */}
                  <div 
                    className="absolute inset-0 backface-hidden border border-purple-500 rounded-lg overflow-hidden shadow-xl bg-gradient-to-br from-gray-900 to-black"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    <div className="p-4 bg-gradient-to-b from-purple-900/20 to-transparent border-b border-purple-500/30">
                      <h3 className="text-lg font-extrabold text-purple-300 text-center">Note des admins</h3>
                    </div>
                    
                    <div className="w-full h-[14rem] bg-purple-900/20 flex items-center justify-center p-4 overflow-y-auto">
                      <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                        {movie.admin_note}
                      </p>
                    </div>

                    {hasNote && (
                      <button
                        onClick={() => toggleFlip(movieKey)}
                        className="group/btn absolute top-2 -left-2 hover:left-0 bg-purple-500 text-white text-xs p-2 rounded-r transition-all opacity-50 hover:w-3/4 hover:opacity-100 z-10"
                      >
                        <span className="block group-hover/btn:hidden">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        <span className="hidden group-hover/btn:block" style={{fontSize: 10, fontWeight: 700}}>Retour</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              );
            })}
          </div>
        )}
      </div>

      {/* Section Deep Waitlist - Les Abysses */}
      {!loadingListMovies && deepMovies.length > 0 && (
        <div className="w-full mt-16">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold mb-2 flex items-center justify-center gap-2">
              <Waves size={24} className="text-blue-400" /> La liste d&apos;attente des abysses
            </h2>
            <p className="text-sm text-gray-500 italic">
              Ces films sont plus difficiles à trouver et arriveront un jour, ou peut-être jamais...
            </p>
          </div>
          
          <div className="flex flex-col gap-2 max-w-2xl mx-auto">
            {deepMovies.map((movie, index) => {
              const movieKey = movie.tmdbID || movie.imdbID;
              const isExpanded = expandedDeep.has(movieKey);
              
              return (
                <div
                  key={movieKey}
                  style={{ animation: `fadeIn 0.4s ease-out ${index * 0.05}s both` }}
                  className="border border-gray-800 rounded-lg bg-gray-900/30 backdrop-blur-sm overflow-hidden transition-all hover:border-gray-700"
                >
                  {/* Ligne compacte */}
                  <div
                    onClick={() => toggleDeepExpand(movieKey)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Waves size={14} className="text-gray-600 shrink-0" />
                      <h3 className="text-sm font-medium text-gray-300 truncate">{movie.Title}</h3>
                      {movie.originalTitle && movie.originalTitle !== movie.Title && (
                        <span className="text-xs text-gray-600 truncate hidden sm:inline">({movie.originalTitle})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-500">{movie.Year}</span>
                      <span className="text-xs text-gray-600">{movie.Type === "tv" ? "Série" : "Film"}</span>
                      <ChevronDown
                        size={14}
                        className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                  
                  {/* Détails expansés */}
                  {isExpanded && (
                    <div className="px-4 pb-4 flex gap-4 border-t border-gray-800/50" style={{ animation: 'fadeIn 0.2s ease-out' }}>
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
                      <div className="flex flex-col gap-2 mt-3 flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-white">{movie.Title}</h4>
                        {movie.originalTitle && movie.originalTitle !== movie.Title && (
                          <p className="text-xs text-gray-500">{movie.originalTitle}</p>
                        )}
                        <p className="text-xs text-gray-400">{movie.Year} · {movie.Type === "tv" ? "Série" : "Film"}</p>
                        
                        {movie.admin_note && (
                          <p className="text-xs text-purple-300 mt-1 italic">{movie.admin_note}</p>
                        )}
                        
                        {/* Boutons inline */}
                        <div className="flex gap-2 mt-2 flex-wrap">
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
                          {adminAuthenticated && (
                            <>
                              <a
                                href={getTorr9Url(movie)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-white px-2 py-1 rounded font-bold hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: 'lab(67.805% -35.3952 -30.2018)' }}
                              >
                                Torr9
                              </a>
                              <button
                                onClick={() => handleEditNote(movie)}
                                className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors"
                              >
                                Note
                              </button>
                              <button
                                onClick={() => setConfirmDelete(movie)}
                                className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded hover:bg-green-500/30 transition-colors"
                              >
                                Ajouté
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {/* Modal de confirmation suppression (abysses) */}
    {confirmDelete && (
      <div
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={() => setConfirmDelete(null)}
      >
        <div
          className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-sm w-full text-center"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          <Waves size={32} className="text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">
            Marquer comme ajouté ?
          </h3>
          <p className="text-sm text-gray-400 mb-5">
            <span className="text-white font-medium">{confirmDelete.Title}</span> sera retiré des abysses et marqué comme ajouté sur Plex.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                handleDeleteMovie(confirmDelete);
                setConfirmDelete(null);
              }}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 transition-colors font-semibold"
            >
              Confirmer
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Modal d'édition de note */}
    {editingNote && (
      <div 
        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        onClick={() => {
          setEditingNote(null);
          setNoteText("");
        }}
      >
        <div 
          className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-semibold text-white">
            Note admin
          </h3>
          <p className="text-xs text-gray-500 italic mt-1 mb-4">Cette note sera visible pour les utilisateurs</p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Ajoutez une note pour ce film..."
            className="w-full h-40 p-3 bg-gray-800 text-white border border-gray-700 rounded-md resize-none focus:border-orange focus:ring-2 focus:ring-orange outline-none"
            autoFocus
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => {
                const movie = listMovies.find(m => (m.tmdbID || m.imdbID) === editingNote);
                if (movie) handleSaveNote(movie);
              }}
              className="flex-1 bg-orange text-white px-4 py-2 rounded-md hover:bg-orange/80 transition-colors font-semibold"
            >
              Enregistrer
            </button>
            <button
              onClick={() => {
                setEditingNote(null);
                setNoteText("");
              }}
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}