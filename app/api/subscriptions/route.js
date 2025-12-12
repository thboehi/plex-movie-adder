// /api/subscriptions/route.js
import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

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
  const db = client.db();
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

/**
 * GET /api/subscriptions
 * Récupère les abonnements
 * Query params:
 * - userId: récupérer les abonnements d'un utilisateur spécifique
 * - status: filtrer par statut (active, expired, all)
 */
export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'all';

    let query = {};

    // Filtre par utilisateur
    if (userId) {
      try {
        query.userId = new ObjectId(userId);
      } catch (error) {
        return NextResponse.json(
          { error: "ID utilisateur invalide" }, 
          { status: 400 }
        );
      }
    }

    // Filtre par statut
    if (status !== 'all') {
      query.status = status;
    }

    const subscriptions = await db.collection("subscriptions")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Enrichir avec les informations utilisateur
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const user = await db.collection("users").findOne({ _id: sub.userId });
          return {
            ...sub,
            userName: user ? `${user.name} ${user.surname}` : "Utilisateur inconnu",
            userEmail: user?.email || ""
          };
        } catch (error) {
          return sub;
        }
      })
    );

    return NextResponse.json({
      subscriptions: enrichedSubscriptions,
      count: enrichedSubscriptions.length,
      total: enrichedSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0)
    });
  } catch (error) {
    console.error("Erreur récupération abonnements:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des abonnements" }, 
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/subscriptions
 * Met à jour le statut des abonnements expirés
 */
export async function PATCH(request) {
  try {
    const { db } = await connectToDatabase();
    const now = new Date();

    // Mettre à jour tous les abonnements dont la date de fin est dépassée
    const result = await db.collection("subscriptions").updateMany(
      { 
        endDate: { $lt: now },
        status: "active"
      },
      { 
        $set: { status: "expired" }
      }
    );

    return NextResponse.json({
      success: true,
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Erreur mise à jour statuts:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour des statuts" }, 
      { status: 500 }
    );
  }
}
