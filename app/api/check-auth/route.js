import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(request) {
  const token = request.cookies.get("authToken")?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false, adminAuthenticated: false });
  }

  try {
    // Vérification du token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    return NextResponse.json({
      authenticated: true,
      adminAuthenticated: payload.adminAuthenticated || false, // Utilise la valeur du JWT
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, adminAuthenticated: false });
  }
}