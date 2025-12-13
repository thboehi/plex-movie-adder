// app/api/movies/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/utils/db";

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