// /api/users/route.js
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/utils/db";

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

    const currentDate = new Date();
    
    // Trier les utilisateurs par date d'expiration
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

    // Formater pour compatibilité avec l'interface actuelle
    const formattedUsers = sortedUsers.map(user => ({
      ...user,
      // Rétrocompatibilité : ajouter subscriptionEnd pour l'interface
      subscriptionEnd: user.subscription?.expiresAt || null
    }));

    return NextResponse.json(formattedUsers);
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
    
    // Créer le nouvel utilisateur avec la structure simple
    const newUser = {
      name,
      surname,
      email,
      role: "user",
      subscription: {
        expiresAt: null,
        isActive: false,
        currentType: null,
        lastPaymentDate: null,
        lastPaymentAmount: 0,
        history: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection("users").insertOne(newUser);
    
    return NextResponse.json({ 
      _id: result.insertedId,
      ...newUser
    }, {status: 201});
    
  } catch (error) {
    console.error("Erreur ajout utilisateur:", error);
    return NextResponse.json({ 
      error: "Erreur ajout utilisateur: " + error.message 
    }, { status: 500 });
  }
}
