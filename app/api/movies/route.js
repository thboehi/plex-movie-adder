// app/api/movies/route.js
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// Vérifiez que la variable d'environnement est bien définie
if (!process.env.MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const uri = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = client.db(); // Utilise la base de données définie dans l'URI
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

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
      .find({ deleted: { $ne: true } })
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
      deleted: false,
    };

    await db.collection("movies").insertOne(movieToInsert);
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
    if (!imdbID) {
      return NextResponse.json(
        { error: "Missing imdbID" },
        { status: 400 }
      );
    }
    const ip = getIp(request);
    const { db } = await connectToDatabase();
    // Au lieu de supprimer, on met à jour le document pour le marquer comme supprimé
    const result = await db.collection("movies").updateOne(
      { imdbID },
      { $set: { deleted: true, deleted_by: ip } }
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