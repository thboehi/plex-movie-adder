// app/api/movies/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/utils/db";

const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;
const TMDB_BASE = "https://api.themoviedb.org/3";

// Fonction utilitaire pour récupérer l'IP depuis les headers de la requête
function getIp(request) {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Récupère les IDs externes (imdb, tvdb) depuis TMDB
async function fetchExternalIds(tmdbID, type) {
  try {
    const mediaType = type === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE}/${mediaType}/${tmdbID}/external_ids`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${TMDB_ACCESS_TOKEN}` },
    });
    if (!response.ok) return {};
    return await response.json();
  } catch (error) {
    console.error("Error fetching external IDs:", error);
    return {};
  }
}

// GET : Renvoie la liste des films NON supprimés
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    // On ne retourne que les films dont le champ "deleted" n'est pas true
    const movies = await db
      .collection("movies")
      .find({ deleted: false })
      .toArray();
    return NextResponse.json(movies);
  } catch (error) {
    console.error("Error in GET:", error);
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}

// POST : Ajoute (ou restaure) un film en enregistrant l'IP de l'ajout
export async function POST(request) {
  try {
    const movie = await request.json();
    const ip = getIp(request);
    const { db } = await connectToDatabase();
    const added_date = new Date();

    // Validation : tmdbID requis (entier positif)
    if (!movie.tmdbID || typeof movie.tmdbID !== "number" || movie.tmdbID <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid tmdbID" },
        { status: 400 }
      );
    }

    // Enrichir avec les IDs externes (imdbID, tvdbID)
    const externalIds = await fetchExternalIds(movie.tmdbID, movie.Type);
    const imdbID = externalIds.imdb_id || null;
    const tvdbID = externalIds.tvdb_id || null;

    // Vérifier si le film existe déjà (par tmdbID ou imdbID pour compat)
    const existingMovie = await db
      .collection("movies")
      .findOne({ $or: [{ tmdbID: movie.tmdbID }, ...(imdbID ? [{ imdbID }] : [])] });

    if (existingMovie) {
      if (!existingMovie.deleted) {
        return NextResponse.json(
          { error: "Movie already exists" },
          { status: 400 }
        );
      } else {
        // Le film était supprimé, on le restaure
        await db.collection("movies").updateOne(
          { _id: existingMovie._id },
          {
            $set: {
              tmdbID: movie.tmdbID,
              imdbID,
              tvdbID,
              Title: movie.Title,
              originalTitle: movie.originalTitle || movie.Title,
              Year: movie.Year,
              Poster: movie.Poster,
              Type: movie.Type,
              deep_waitlist: movie.deep_waitlist || false,
              deleted: false,
              added_by: ip,
              deleted_by: null,
              deleted_date: null,
              added_date,
            },
          }
        );
        const updatedMovie = await db
          .collection("movies")
          .findOne({ _id: existingMovie._id });
        return NextResponse.json(updatedMovie, { status: 200 });
      }
    }

    // Ajout d'un nouveau film
    const movieToInsert = {
      tmdbID: movie.tmdbID,
      imdbID,
      tvdbID,
      Title: movie.Title,
      originalTitle: movie.originalTitle || movie.Title,
      Year: movie.Year,
      Poster: movie.Poster,
      Type: movie.Type,
      deep_waitlist: movie.deep_waitlist || false,
      added_by: ip,
      added_date,
      deleted: false,
      deleted_date: null,
    };

    await db.collection("movies").insertOne(movieToInsert);

    // Notification à n8n
    try {
      const fetch = (await import('node-fetch')).default;
      const https = await import('https');
      
      const webhookData = {
        title: movie.Title,
        year: movie.Year,
        tmdbID: movie.tmdbID,
        imdbID,
        poster: movie.Poster,
        type: movie.Type,
        deep_waitlist: movie.deep_waitlist || false,
        added_date,
      };

      const httpsAgent = new https.Agent({ rejectUnauthorized: false });

      const webhookResponse = await fetch(process.env.N8N_WEBHOOK_LINK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [process.env.N8N_WEBHOOK_HEADER]: process.env.N8N_WEBHOOK_PASSWORD
        },
        body: JSON.stringify(webhookData),
        agent: httpsAgent
      });

      if (!webhookResponse.ok) {
        console.warn("Webhook notification failed:", await webhookResponse.text());
      }
    } catch (webhookError) {
      console.error("Error sending webhook notification:", webhookError);
    }

    return NextResponse.json(movieToInsert, { status: 201 });

  } catch (error) {
    console.error("Error in POST:", error);
    return NextResponse.json(
      { error: "Failed to add movie" },
      { status: 500 }
    );
  }
}

// PATCH : Met à jour la note ou le deep_waitlist d'un film (admin uniquement)
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { imdbID, tmdbID, admin_note, deep_waitlist } = body;
    
    // On accepte identification par tmdbID ou imdbID
    if (!tmdbID && !imdbID) {
      return NextResponse.json(
        { error: "Missing tmdbID or imdbID" },
        { status: 400 }
      );
    }
    
    // Validation imdbID si fourni
    if (imdbID && (typeof imdbID !== 'string' || !/^tt\d+$/.test(imdbID))) {
      return NextResponse.json(
        { error: "Invalid imdbID format" },
        { status: 400 }
      );
    }
    
    const { db } = await connectToDatabase();
    
    // Construire le filtre de recherche
    const filter = tmdbID ? { tmdbID } : { imdbID };
    
    // Construire les champs à mettre à jour
    const updateFields = { note_updated_at: new Date() };
    if (admin_note !== undefined) updateFields.admin_note = admin_note || null;
    if (deep_waitlist !== undefined) updateFields.deep_waitlist = !!deep_waitlist;
    
    const result = await db.collection("movies").updateOne(
      filter,
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }
    
    const updatedMovie = await db.collection("movies").findOne(filter);
    
    return NextResponse.json(updatedMovie);
  } catch (error) {
    console.error("Error in PATCH:", error);
    return NextResponse.json(
      { error: "Failed to update movie" },
      { status: 500 }
    );
  }
}

// DELETE : Soft-delete un film (marque deleted=true)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imdbID = searchParams.get("imdbID");
    const tmdbID = searchParams.get("tmdbID");
    
    if (!imdbID && !tmdbID) {
      return NextResponse.json(
        { error: "Missing imdbID or tmdbID" },
        { status: 400 }
      );
    }
    
    // Validation imdbID si fourni
    if (imdbID && (typeof imdbID !== 'string' || !/^tt\d+$/.test(imdbID))) {
      return NextResponse.json(
        { error: "Invalid imdbID format" },
        { status: 400 }
      );
    }
    
    const ip = getIp(request);
    const deleted_date = new Date();
    const { db } = await connectToDatabase();
    
    const filter = tmdbID ? { tmdbID: parseInt(tmdbID, 10) } : { imdbID };
    
    const result = await db.collection("movies").updateOne(
      filter,
      { $set: { deleted: true, deleted_by: ip, deleted_date } }
    );
    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Movie not found or already trashed" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE:", error);
    return NextResponse.json(
      { error: "Failed to delete movie" },
      { status: 500 }
    );
  }
}