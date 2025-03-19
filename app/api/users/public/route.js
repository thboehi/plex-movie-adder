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
        
        // Utiliser la projection MongoDB pour ne renvoyer que les champs spécifiés
        const users = await db.collection("users").find({}, {
        projection: {
            _id: 1,       // Inclure l'ID
            name: 1,      // Inclure le prénom
            subscriptionEnd: 1  // Inclure la date d'expiration
        }
        }).toArray();

        // Ajouter un champ surname masqué pour chaque utilisateur
        const maskedUsers = users.map(user => ({
            ...user,
            surname: "****",  // Ajouter un champ surname masqué
            info: "Certaines données ont été protégées pour des raisons de confidentialités. Les informations sensibles ne sont accessibles qu'aux administrateurs."
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