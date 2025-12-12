// /api/users/public/route.js
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

  const client = await MongoClient.connect(uri);
  const db = client.db();
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
        
        // Récupérer les utilisateurs avec la nouvelle structure
        const users = await db.collection("users").find({}, {
          projection: {
            _id: 1,
            name: 1,
            "subscription.expiresAt": 1,
            "subscription.isActive": 1
          }
        }).toArray();

        // Trier par date d'expiration
        const currentDate = new Date();
        const sortedUsers = users.sort((a, b) => {
          const dateA = a.subscription?.expiresAt ? new Date(a.subscription.expiresAt) : new Date(0);
          const dateB = b.subscription?.expiresAt ? new Date(b.subscription.expiresAt) : new Date(0);
          
          const isPastA = dateA < currentDate;
          const isPastB = dateB < currentDate;
          
          if (isPastA && isPastB) {
            return dateA - dateB;
          } else if (isPastA) {
            return 1;
          } else if (isPastB) {
            return -1;
          } else {
            return dateA - dateB;
          }
        });

        // Masquer les données sensibles et ajouter rétrocompatibilité
        const maskedUsers = sortedUsers.map(user => ({
            _id: user._id,
            name: user.name,
            surname: "****",
            subscriptionEnd: user.subscription?.expiresAt || null,  // Rétrocompatibilité
            info: "Certaines données ont été protégées pour des raisons de confidentialité. Les informations sensibles ne sont accessibles qu'aux administrateurs."
        }));
        
        return NextResponse.json(maskedUsers);
    } catch (error) {
        console.error("Erreur dans GET:", error);
        return NextResponse.json(
        { error: "Erreur récupération utilisateurs" },
        { status: 500 }
        );
    }
}