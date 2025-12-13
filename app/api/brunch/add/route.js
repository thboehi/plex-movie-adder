// /api/brunch/add/route.js
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/utils/db";

export async function POST(request) {
  try {
    const { userId, amount, months } = await request.json();
    console.log("Requête reçue:", { userId, amount, months });

    // Validation des formules
    const validSubscriptions = {
      "3": { amount: 29.90, type: "quarterly" },
      "12": { amount: 100, type: "annual" }
    };

    if (!validSubscriptions[months]) {
      return NextResponse.json({ 
        error: "Formule invalide. Seulement 3 ou 12 mois autorisés." 
      }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const userIdObject = new ObjectId(userId);

    // Récupérer l'utilisateur
    const user = await db.collection("users").findOne({ _id: userIdObject });
    if (!user) {
      console.error("Utilisateur non trouvé:", userId);
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    console.log("Utilisateur trouvé:", user.name, user.surname);

    const now = new Date();
    const monthsNum = parseInt(months, 10);
    const subscriptionConfig = validSubscriptions[months];
    
    // Calculer la nouvelle date d'expiration
    let newExpiresAt;
    const currentExpiresAt = user.subscription?.expiresAt 
      ? new Date(user.subscription.expiresAt) 
      : null;

    if (currentExpiresAt && currentExpiresAt > now) {
      // Prolonger à partir de la date actuelle d'expiration
      newExpiresAt = new Date(currentExpiresAt);
      newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsNum);
      console.log("Prolongation depuis:", currentExpiresAt.toLocaleDateString());
    } else {
      // Nouvelle souscription à partir d'aujourd'hui
      newExpiresAt = new Date(now);
      newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsNum);
      console.log("Nouvelle souscription depuis aujourd'hui");
    }

    console.log("Nouvelle expiration:", newExpiresAt.toLocaleDateString());

    // Créer l'entrée d'historique
    const historyEntry = {
      date: now,
      amount: parseFloat(amount),
      type: subscriptionConfig.type,
      months: monthsNum,
      expiresAt: newExpiresAt
    };

    // Mettre à jour l'utilisateur avec la structure simple
    const updateResult = await db.collection("users").updateOne(
      { _id: userIdObject },
      {
        $set: {
          "subscription.expiresAt": newExpiresAt,
          "subscription.isActive": true,
          "subscription.currentType": subscriptionConfig.type,
          "subscription.lastPaymentDate": now,
          "subscription.lastPaymentAmount": parseFloat(amount),
          "updatedAt": now
        },
        $push: {
          "subscription.history": historyEntry
        }
      }
    );

    console.log("Résultat mise à jour:", updateResult);

    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
      // L'utilisateur n'a pas de structure subscription, on l'initialise
      await db.collection("users").updateOne(
        { _id: userIdObject },
        {
          $set: {
            subscription: {
              expiresAt: newExpiresAt,
              isActive: true,
              currentType: subscriptionConfig.type,
              lastPaymentDate: now,
              lastPaymentAmount: parseFloat(amount),
              history: [historyEntry]
            },
            updatedAt: now
          }
        }
      );
      console.log("Structure subscription initialisée");
    }

    return NextResponse.json({ 
      success: true,
      expiresAt: newExpiresAt,
      type: subscriptionConfig.type,
      isActive: true
    }, { status: 200 });

  } catch (error) {
    console.error("Erreur ajout abonnement:", error);
    return NextResponse.json({ 
      error: "Erreur serveur: " + error.message 
    }, { status: 500 });
  }
}