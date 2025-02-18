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

// GET : Renvoie la liste des films supprimés
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    // On ne retourne que les films dont le champ "deleted" est true
    const movies = await db
      .collection("movies")
      .find({ deleted: true })
      .toArray();
    return NextResponse.json(movies);
  } catch (error) {
    console.error("Error in GET_DELETED:", error);
    return NextResponse.json(
      { error: "Failed to fetch deleted movies" },
      { status: 500 }
    );
  }
}