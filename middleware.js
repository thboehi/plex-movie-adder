import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

// Liste des routes qui nécessitent une authentification
const protectedRoutes = ["/api/users", "/api/brunch", "/api/movies"];

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Vérifier si la route est protégée
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const token = request.cookies.get("authToken")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // Stocker l'utilisateur pour l'accès dans les API
    request.user = user;
  }

  return NextResponse.next();
}

// Appliquer le middleware aux routes API seulement
export const config = {
  matcher: "/api/:path*",
};