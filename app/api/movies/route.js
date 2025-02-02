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

// GET : Renvoie la liste des films
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const movies = await db.collection("movies").find({}).toArray();
    return NextResponse.json(movies);
  } catch (error) {
    console.error("Error in GET:", error);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}

// POST : Ajoute un film
export async function POST(request) {
  try {
    const movie = await request.json();
    const { db } = await connectToDatabase();
    // Vérifier que le film n'existe pas déjà
    const existingMovie = await db.collection("movies").findOne({ imdbID: movie.imdbID });
    if (existingMovie) {
      return NextResponse.json({ error: "Movie already exists" }, { status: 400 });
    }
    await db.collection("movies").insertOne(movie);
    return NextResponse.json(movie, { status: 201 });
  } catch (error) {
    console.error("Error in POST:", error);
    return NextResponse.json({ error: "Failed to add movie" }, { status: 500 });
  }
}

// DELETE : Supprime un film en fonction de son imdbID (passé en query)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const imdbID = searchParams.get("imdbID");
    if (!imdbID) {
      return NextResponse.json({ error: "Missing imdbID" }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    const result = await db.collection("movies").deleteOne({ imdbID });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE:", error);
    return NextResponse.json({ error: "Failed to delete movie" }, { status: 500 });
  }
}