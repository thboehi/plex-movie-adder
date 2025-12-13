// /api/subscriptions/route.js
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/app/utils/db";

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

    let matchStage = {};

    // Filtre par utilisateur
    if (userId) {
      try {
        matchStage.userId = new ObjectId(userId);
      } catch (error) {
        return NextResponse.json(
          { error: "ID utilisateur invalide" }, 
          { status: 400 }
        );
      }
    }

    // Filtre par statut
    if (status !== 'all') {
      matchStage.status = status;
    }

    // Utiliser une agrégation avec lookup pour optimiser les performances
    // Au lieu de N requêtes (une par abonnement), on fait une seule requête
    const enrichedSubscriptions = await db.collection("subscriptions").aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          type: 1,
          amount: 1,
          startDate: 1,
          endDate: 1,
          status: 1,
          createdAt: 1,
          userName: {
            $cond: {
              if: "$userInfo",
              then: { $concat: ["$userInfo.name", " ", "$userInfo.surname"] },
              else: "Utilisateur inconnu"
            }
          },
          userEmail: {
            $ifNull: ["$userInfo.email", ""]
          }
        }
      }
    ]).toArray();

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
