// app/api/movies/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/utils/db";

// Fonction utilitaire pour récupérer l'IP depuis les headers de la requête
function getIp(request) {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
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

    // Vérifier si le film existe déjà
    const existingMovie = await db
      .collection("movies")
      .findOne({ imdbID: movie.imdbID });

    if (existingMovie) {
      if (!existingMovie.deleted) {
        // Le film existe déjà et n'est pas supprimé, on renvoie une erreur
        return NextResponse.json(
          { error: "Movie already exists" },
          { status: 400 }
        );
      } else {
        // Le film était supprimé, on le restaure en mettant à jour les infos
        await db.collection("movies").updateOne(
          { imdbID: movie.imdbID },
          {
            $set: {
              ...movie,
              deleted: false,
              added_by: ip,
              // On peut aussi effacer le champ deleted_by si présent
              deleted_by: null,
              deleted_date: null,
              added_date,
            },
          }
        );
        const updatedMovie = await db
          .collection("movies")
          .findOne({ imdbID: movie.imdbID });
        return NextResponse.json(updatedMovie, { status: 200 });
      }
    }

    // Ajout d'un nouveau film avec l'IP de l'ajout et deleted à false
    const movieToInsert = {
      ...movie,
      added_by: ip,
      added_date,
      deleted: false,
      deleted_date: null,
    };

    await db.collection("movies").insertOne(movieToInsert);

    // Notification à n8n
    try {
      // Préparer les données pour le webhook
      const webhookData = {
        title: movie.Title,
        year: movie.Year,
        imdbID: movie.imdbID,
        poster: movie.Poster,
        added_date: added_date
      };

      // Configuration du fetch avec gestion SSL optionnelle
      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [process.env.N8N_WEBHOOK_HEADER]: process.env.N8N_WEBHOOK_PASSWORD
        },
        body: JSON.stringify(webhookData)
      };

      // Si défini dans l'env, désactiver la vérification SSL (utile pour certificats auto-signés)
      if (process.env.N8N_DISABLE_SSL_VERIFY === "true") {
        fetchOptions.agent = new (await import("https")).Agent({
          rejectUnauthorized: false
        });
      }

      // Appel au webhook n8n
      const webhookResponse = await fetch(process.env.N8N_WEBHOOK_LINK, fetchOptions);

      if (!webhookResponse.ok) {
        console.warn("Webhook notification failed:", await webhookResponse.text());
      } else {
        console.log("Webhook notification sent successfully");
      }
    } catch (webhookError) {
      // On ne bloque pas le flux principal en cas d'erreur du webhook
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

// DELETE : Au lieu de supprimer définitivement, on met le film en "trash"
// en mettant à jour le champ "deleted" et en enregistrant l'IP dans "deleted_by"
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imdbID = searchParams.get("imdbID");
    
    // Validation stricte de l'imdbID
    if (!imdbID) {
      return NextResponse.json(
        { error: "Missing imdbID" },
        { status: 400 }
      );
    }
    
    if (typeof imdbID !== 'string' || !/^tt\d+$/.test(imdbID)) {
      return NextResponse.json(
        { error: "Invalid imdbID format" },
        { status: 400 }
      );
    }
    
    const ip = getIp(request);
    const deleted_date = new Date();
    const { db } = await connectToDatabase();
    // Au lieu de supprimer, on met à jour le document pour le marquer comme supprimé
    const result = await db.collection("movies").updateOne(
      { imdbID },
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