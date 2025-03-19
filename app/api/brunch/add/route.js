// /api/brunch/add/route.js
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

export async function POST(request) {
    try {
      const { userId, amount, months } = await request.json();
      const userIdObject = new ObjectId(userId);
      console.log("Requête reçue:", { userId, amount, months });
  
      const { db } = await connectToDatabase();
      const user = await db.collection("users").findOne({ _id: userIdObject });
  
      if (!user) {
        console.error("Utilisateur non trouvé:", userId);
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
      }
  
      console.log("Utilisateur trouvé:", user);
  
      let newExpirationDate;
      const now = new Date();
  
      if (user.subscriptionEnd && new Date(user.subscriptionEnd) > now) {
        // Ajoute les mois à la date actuelle d'expiration
        newExpirationDate = new Date(user.subscriptionEnd);
        console.log("Abonnement en cours, nouvelle date de départ:", newExpirationDate);
      } else {
        // Si expiré ou jamais eu d'abonnement, on part d'aujourd'hui
        newExpirationDate = now;
        console.log("Aucun abonnement actif, départ aujourd'hui:", newExpirationDate);
      }
  
      // Ajouter les mois
      newExpirationDate.setMonth(newExpirationDate.getMonth() + parseInt(months, 10));
      console.log("Nouvelle date d'expiration:", newExpirationDate);
  
      // Mettre à jour la date d'expiration de l'utilisateur
      const updateResult = await db.collection("users").updateOne(
        { _id: userIdObject },
        { $set: { subscriptionEnd: newExpirationDate } }
      );
  
      console.log("Résultat de la mise à jour:", updateResult);
  
      if (updateResult.modifiedCount === 0) {
        console.warn("Aucune mise à jour effectuée, vérifiez l'ID utilisateur.");
      }
  
      // Enregistrer le paiement dans brunch
      const newPayment = {
        userId,
        amount,
        months,
        paymentDate: now,
      };
      const paymentInsertResult = await db.collection("brunch").insertOne(newPayment);
  
      console.log("Paiement ajouté:", paymentInsertResult);
  
      return NextResponse.json({ success: true, newExpirationDate }, { status: 200 });
    } catch (error) {
      console.error("Erreur ajout abonnement:", error);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }