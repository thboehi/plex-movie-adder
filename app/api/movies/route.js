// app/api/movies/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Chemin vers le fichier JSON
const filePath = path.join(process.cwd(), "data", "movies.json");

// Fonction pour lire les films depuis le fichier JSON
function readMovies() {
  try {
    if (!fs.existsSync(filePath)) {
      // Si le fichier n'existe pas, le créer avec un tableau vide
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify([]), "utf8");
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erreur de lecture du fichier:", error);
    return [];
  }
}

// Fonction pour écrire les films dans le fichier JSON
function writeMovies(movies) {
  fs.writeFileSync(filePath, JSON.stringify(movies, null, 2), "utf8");
}

// GET : Renvoie la liste des films
export async function GET() {
  const movies = readMovies();
  return NextResponse.json(movies);
}

// POST : Ajoute un film
export async function POST(request) {
  const movie = await request.json();
  let movies = readMovies();
  // Vérifier que le film n'existe pas déjà
  if (!movies.some((m) => m.imdbID === movie.imdbID)) {
    movies.push(movie);
    writeMovies(movies);
    return NextResponse.json(movie, { status: 201 });
  }
  return NextResponse.json({ error: "Movie already exists" }, { status: 400 });
}

// DELETE : Supprime un film en fonction de son imdbID (passé en query)
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const imdbID = searchParams.get("imdbID");
  if (!imdbID) {
    return NextResponse.json({ error: "Missing imdbID" }, { status: 400 });
  }
  let movies = readMovies();
  const newMovies = movies.filter((m) => m.imdbID !== imdbID);
  if (newMovies.length === movies.length) {
    return NextResponse.json({ error: "Movie not found" }, { status: 404 });
  }
  writeMovies(newMovies);
  return NextResponse.json({ success: true });
}