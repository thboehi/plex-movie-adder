// app/api/migrate/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/utils/db";

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

// Petit délai pour respecter le rate limit TMDB (~40 req/10s)
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DELAY_MS = 100;

// POST : Migre les films existants sans tmdbID, par batch
// Usage : curl -X POST /api/migrate?limit=10 -H "x-admin-password: ..."
// Relancer plusieurs fois jusqu'à ce que total=0
export async function POST(request) {
  try {
    // Vérification admin simple via le header
    const adminPass = request.headers.get("x-admin-password");
    if (adminPass !== process.env.ADMIN_ACCESS_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "8", 10), 20);

    const { db } = await connectToDatabase();

    // Trouver les films sans tmdbID (batch limité)
    const moviesToMigrate = await db
      .collection("movies")
      .find({ $or: [{ tmdbID: { $exists: false } }, { tmdbID: null }] })
      .limit(limit)
      .toArray();

    const report = { total: moviesToMigrate.length, migrated: 0, failed: 0, errors: [] };

    for (const movie of moviesToMigrate) {
      try {
        if (!movie.imdbID) {
          report.failed++;
          report.errors.push({ title: movie.Title, reason: "No imdbID" });
          continue;
        }

        // Chercher le film/série sur TMDB via l'imdbID
        const findUrl = `${TMDB_BASE}/find/${movie.imdbID}?external_source=imdb_id&language=fr-FR`;
        const findResponse = await fetch(findUrl, {
          headers: { Authorization: `Bearer ${TMDB_ACCESS_TOKEN}` },
        });

        if (!findResponse.ok) {
          report.failed++;
          report.errors.push({
            title: movie.Title,
            imdbID: movie.imdbID,
            reason: `TMDB API error: ${findResponse.status}`,
          });
          await delay(DELAY_MS);
          continue;
        }

        const findData = await findResponse.json();

        // Chercher dans movie_results ou tv_results
        let tmdbResult = null;
        let mediaType = "movie";

        if (findData.movie_results && findData.movie_results.length > 0) {
          tmdbResult = findData.movie_results[0];
          mediaType = "movie";
        } else if (findData.tv_results && findData.tv_results.length > 0) {
          tmdbResult = findData.tv_results[0];
          mediaType = "tv";
        }

        if (!tmdbResult) {
          report.failed++;
          report.errors.push({
            title: movie.Title,
            imdbID: movie.imdbID,
            reason: "Not found on TMDB",
          });
          await delay(DELAY_MS);
          continue;
        }

        // Récupérer external_ids pour tvdbID
        const extUrl = `${TMDB_BASE}/${mediaType}/${tmdbResult.id}/external_ids`;
        const extResponse = await fetch(extUrl, {
          headers: { Authorization: `Bearer ${TMDB_ACCESS_TOKEN}` },
        });
        const extData = extResponse.ok ? await extResponse.json() : {};

        const isMovie = mediaType === "movie";
        const frTitle = isMovie
          ? tmdbResult.title || tmdbResult.original_title
          : tmdbResult.name || tmdbResult.original_name;
        const originalTitle = isMovie
          ? tmdbResult.original_title
          : tmdbResult.original_name;

        // Mettre à jour le document
        await db.collection("movies").updateOne(
          { _id: movie._id },
          {
            $set: {
              tmdbID: tmdbResult.id,
              tvdbID: extData.tvdb_id || null,
              Title: frTitle,
              originalTitle: originalTitle,
              Poster: tmdbResult.poster_path
                ? `${TMDB_IMAGE_BASE}${tmdbResult.poster_path}`
                : movie.Poster,
              Type: mediaType,
              deep_waitlist: movie.deep_waitlist || false,
            },
          }
        );

        report.migrated++;
        await delay(DELAY_MS); // Rate limiting
      } catch (error) {
        report.failed++;
        report.errors.push({
          title: movie.Title,
          imdbID: movie.imdbID,
          reason: error.message,
        });
        await delay(DELAY_MS);
      }
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error in migration:", error);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 }
    );
  }
}
