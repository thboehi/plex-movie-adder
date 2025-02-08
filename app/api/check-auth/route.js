// app/api/check-auth/route.js
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function GET(request) {
  const token = request.cookies.get("authToken")?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return NextResponse.json({ authenticated: false });
  }
}