// /api/users/route.js
import { MongoClient } from "mongodb";
import { NextResponse } from "next/server";

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

export async function GET(req, res) {

  try {
    const { db } = await connectToDatabase();
    const users = await db.collection("users").find({}).toArray();

    // Obtenir la date actuelle
    const currentDate = new Date();
    
    // Trier les utilisateurs
    const sortedUsers = users.sort((a, b) => {
      const dateA = new Date(a.subscriptionEnd || 0);
      const dateB = new Date(b.subscriptionEnd || 0);
      
      // Si les deux dates sont dans le passé
      const isPastA = dateA < currentDate;
      const isPastB = dateB < currentDate;
      
      if (isPastA && isPastB) {
        // Les deux sont expirés - trier par date la plus lointaine dans le passé en premier
        return dateA - dateB;
      } else if (isPastA) {
        // Seulement A est expiré - B vient en premier
        return 1;
      } else if (isPastB) {
        // Seulement B est expiré - A vient en premier
        return -1;
      } else {
        // Aucun n'est expiré - trier par date la plus proche en premier
        return dateA - dateB;
      }
    });

    return NextResponse.json(sortedUsers);
  } catch (error) {
    console.error("Erreur dans GET:", error);
    return NextResponse.json(
        { error: "Erreur récupération utilisateurs" },
        { status: 500 }
    );
  }
}

export async function POST(req, res) {
  try {
    const { name, surname, email } = await req.json();
    if (!name || !surname || !email) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, {status: 400});
    }
    const { db } = await connectToDatabase();
    const result = await db.collection("users").insertOne({ name, surname, email });
    return NextResponse.json({ _id: result.insertedId, name, surname, email }, {status: 201});
  } catch (error) {
    return NextResponse.json({ error: "Erreur ajout utilisateur :\n" + error + "\n\nData received :\n" + req.json }, { status: 500 });
  }
}
