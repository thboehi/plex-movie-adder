// /api/users/public/route.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/utils/db";

// Fonction utilitaire pour récupérer l'IP depuis les headers de la requête
function getIp(request) {
    return (
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown"
    );
}

// Fonction pour obfusquer l'email
function obfuscateEmail(email) {
    if (!email) return "N/A";
    const match = email.match(/^(.{2})(.*)(@.*)$/);
    if (match) {
        return `${match[1]}***${match[3]}`;
    }
    return "***";
}

export async function GET(req, res) {
    // Vérifier l'authentification
    const token = req.cookies.get("authToken")?.value;
    let isAdmin = false;
    
    if (token) {
        try {
            const secret = new TextEncoder().encode(process.env.JWT_SECRET);
            const { payload } = await jwtVerify(token, secret);
            isAdmin = payload.adminAuthenticated || false;
        } catch (error) {
            // Token invalide, continuer en tant que non-admin
        }
    }
    
    try {
        const { db } = await connectToDatabase();
        
        // Récupérer tous les utilisateurs avec toutes leurs données
        const users = await db.collection("users").find({}).toArray();

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

        // Obfusquer les données sensibles pour les non-admins
        const processedUsers = sortedUsers.map(user => {
            const baseData = {
                _id: user._id,
                name: user.name,
                surname: isAdmin ? user.surname : (user.surname ? user.surname.charAt(0) + "." : "N/A"),
                email: isAdmin ? user.email : obfuscateEmail(user.email),
                role: user.role,
                subscription: {
                    expiresAt: user.subscription?.expiresAt || null,
                    isActive: user.subscription?.isActive || false,
                    currentType: user.subscription?.currentType || null,
                    lastPaymentDate: user.subscription?.lastPaymentDate || null,
                    lastPaymentAmount: user.subscription?.lastPaymentAmount || null,
                    // Historique : dernier seulement pour non-admin, tout pour admin
                    history: isAdmin 
                        ? (user.subscription?.history || []) 
                        : (user.subscription?.history?.slice(-1) || [])
                },
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                // Rétrocompatibilité
                subscriptionEnd: user.subscription?.expiresAt || null
            };
            
            return baseData;
        });
        
        return NextResponse.json(processedUsers);
    } catch (error) {
        console.error("Erreur dans GET:", error);
        return NextResponse.json(
        { error: "Erreur récupération utilisateurs" },
        { status: 500 }
        );
    }
}