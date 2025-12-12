import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;

// Structure des routes selon les exigences d'accès
const routesConfig = {
  // Routes accessibles aux utilisateurs authentifiés
  authenticated: [
    "/api/movies",
    "/api/movies/deleted",
    "/api/users/public"
  ],
  // Routes accessibles uniquement aux administrateurs
  adminOnly: [
    "/api/users",
    "/api/brunch",
    "/api/brunch/add",
  ]
};

/**
 * Vérifie et décode un token JWT
 * @param {string} token - Le token JWT à vérifier
 * @returns {Object|null} - Le payload du token si valide, null sinon
 */
async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(
      token, 
      new TextEncoder().encode(JWT_SECRET)
    );
    return payload;
  } catch (error) {
    console.error("Erreur de vérification du token:", error.message);
    return null;
  }
}

/**
 * Vérifie si une route correspond exactement à un modèle
 * @param {string} pathname - Le chemin de la route à vérifier
 * @param {string} route - Le modèle de route à comparer
 * @returns {boolean} - True si la route correspond exactement au modèle
 */
function isExactRouteMatch(pathname, route) {
  // Cas spécial pour les sous-routes explicites comme "/api/users/public"
  if (route.includes("/public")) {
    return pathname.startsWith(route);
  }
  
  // Si c'est une route parente comme "/api/users", on doit s'assurer que ce n'est pas une sous-route
  const routeParts = route.split('/');
  const pathParts = pathname.split('/');
  
  // Si le chemin a plus de segments que la route et tous les segments de la route correspondent
  if (pathParts.length > routeParts.length) {
    // Vérifions s'il existe une route authentifiée spécifique pour ce chemin
    const isSpecificAuthRoute = routesConfig.authenticated.some(authRoute => 
      pathname.startsWith(authRoute)
    );
    
    if (isSpecificAuthRoute) {
      return false; // Si c'est une sous-route authentifiée spécifique, ce n'est pas une correspondance pour la route admin
    }
  }
  
  return pathname.startsWith(route);
}

export default async function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // Extraire le token
  const token = request.cookies.get("authToken")?.value;
  
  // Vérifier si la route nécessite une authentification utilisateur (plus spécifique d'abord)
  const isProtectedRoute = routesConfig.authenticated.some(route => pathname.startsWith(route));
  
  // Vérifier si la route nécessite une authentification admin (en excluant les routes authentifiées spécifiques)
  const isAdminRoute = !isProtectedRoute && routesConfig.adminOnly.some(
    route => isExactRouteMatch(pathname, route)
  );
  
  // Si la route nécessite une authentification (admin ou utilisateur)
  if (isAdminRoute || isProtectedRoute) {
    // Vérifier si le token existe
    if (!token) {
      return NextResponse.json(
        { error: "Authentification requise" }, 
        { status: 401 }
      );
    }
    
    // Vérifier si le token est valide
    const userData = await verifyToken(token);
    if (!userData) {
      return NextResponse.json(
        { error: "Session invalide" }, 
        { status: 401 }
      );
    }
    
    // Pour les routes admin, vérifier si l'utilisateur est admin
    if (isAdminRoute && !userData.adminAuthenticated) {
      return NextResponse.json(
        { error: "Accès non autorisé. Droits d'administrateur requis." }, 
        { status: 403 }
      );
    }
    
    // Pour les routes protégées, vérifier si l'utilisateur est authentifié
    if (isProtectedRoute && !userData.authenticated) {
      return NextResponse.json(
        { error: "Accès non autorisé" }, 
        { status: 403 }
      );
    }
    
    // Ajouter l'utilisateur à la requête pour y accéder dans les API
    const requestWithUser = new Request(request);
    requestWithUser.user = userData;
    return NextResponse.next({
      request: requestWithUser
    });
  }
  
  // Si la route n'est pas protégée, continuer normalement
  return NextResponse.next();
}

// Appliquer le middleware aux routes API seulement
export const config = {
  matcher: "/api/:path*",
};