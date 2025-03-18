// app/api/auth/route.js
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { MongoClient } from "mongodb";

// Vérifiez que la variable d'environnement est définie
if (!process.env.MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

const uri = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

// Fonction de connexion à MongoDB (avec mise en cache)
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

// Fonction utilitaire pour récupérer l'IP du client depuis les headers
function getIp(request) {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  const { password } = await request.json();

  // Récupération d'informations pour l'audit
  const ip = getIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";
  const timestamp = new Date();
  const loginSuccessful = password === process.env.ACCESS_PASSWORD;

  // Enregistrement de la tentative de connexion dans la collection d'audit,
  // en enregistrant le mot de passe tenté et le résultat (success)
  try {
    const { db } = await connectToDatabase();
    await db.collection("audit_logs").insertOne({
      event: "login_attempt",
      attempted_password: password,
      ip,
      userAgent,
      timestamp,
      success: loginSuccessful,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de l'audit :", error);
    // On peut continuer même si l'enregistrement d'audit échoue
  }

  if (loginSuccessful) {
    // Création du token JWT qui expire dans 7 jours
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ authenticated: true, adminAuthenticated: false })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret);

    const response = NextResponse.json({ success: true });
    response.cookies.set("authToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });
    response.cookies.set("lastLoginAs", "user", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 jours
    });
    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}