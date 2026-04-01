// app/api/search/route.js
import { NextResponse } from "next/server";

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const url = `${TMDB_BASE}/search/multi?query=${encodeURIComponent(query.trim())}&language=fr-FR&include_adult=false&page=1`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("TMDB API error:", response.status, await response.text());
      return NextResponse.json(
        { error: "Failed to search TMDB" },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Filter to only movies and TV shows, normalize to our format
    const results = data.results
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 20)
      .map((r) => {
        const isMovie = r.media_type === "movie";
        return {
          tmdbID: r.id,
          Title: isMovie ? (r.title || r.original_title) : (r.name || r.original_name),
          originalTitle: isMovie ? r.original_title : r.original_name,
          Year: isMovie
            ? (r.release_date ? r.release_date.split("-")[0] : "N/A")
            : (r.first_air_date ? r.first_air_date.split("-")[0] : "N/A"),
          Poster: r.poster_path ? `${TMDB_IMAGE_BASE}${r.poster_path}` : null,
          Type: r.media_type, // "movie" or "tv"
          overview: r.overview || "",
        };
      });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in search:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
