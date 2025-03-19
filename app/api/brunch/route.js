// /api/brunch/route.js
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

function getIp(request) {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Si un userId est fourni, récupérer les paiements de cet utilisateur spécifique
    if (userId) {
      console.log(`Récupération des paiements pour l'utilisateur: ${userId}`);
      
      // Vérifier d'abord si l'utilisateur existe
      try {
        const userIdObject = new ObjectId(userId);
        const user = await db.collection("users").findOne({ _id: userIdObject });
        
        if (!user) {
          return NextResponse.json(
            { error: "Utilisateur introuvable" }, 
            { status: 404 }
          );
        }
        
        // Récupérer les paiements pour cet utilisateur
        const payments = await db.collection("brunch")
          .find({ userId: userId })
          .sort({ paymentDate: -1 }) // Tri par date décroissante (plus récent d'abord)
          .toArray();
        
        return NextResponse.json({
          userId,
          userName: `${user.name}`,
          userSurname: `${user.surname}`,
          payments,
          total: payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0)
        });
      } catch (error) {
        // Si l'ID n'est pas un ObjectId valide
        console.error("Erreur d'ID:", error.message);
        return NextResponse.json(
          { error: "ID utilisateur invalide" }, 
          { status: 400 }
        );
      }
    } 
    // Sinon, récupérer tous les paiements
    else {
      console.log("Récupération de tous les paiements");
      
      // Récupérer tous les paiements
      const payments = await db.collection("brunch")
        .find({})
        .sort({ paymentDate: -1 })
        .toArray();
      
      // Enrichir les données avec les informations des utilisateurs
      const enhancedPayments = await Promise.all(
        payments.map(async (payment) => {
          try {
            const userIdObject = new ObjectId(payment.userId);
            const user = await db.collection("users").findOne({ _id: userIdObject });
            
            return {
              ...payment,
              userName: user ? `${user.name}` : "****",
              userSurname: user ? `${user.surname}` : "****"
            };
          } catch (error) {
            return {
              ...payment,
              userName: "ID utilisateur invalide"
            };
          }
        })
      );
      
      return NextResponse.json({
        payments: enhancedPayments,
        total: payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0),
        count: payments.length
      });
    }
  } catch (error) {
    console.error("Erreur récupération paiements:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des paiements" }, 
      { status: 500 }
    );
  }
}