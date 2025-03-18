// app/api/auth/logout/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
    const response = NextResponse.json({ success: true });

    // Supprimer le cookie en le mettant à vide et avec maxAge à 0
    response.cookies.set("authToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(0), // Expire immédiatement
    });
    // response.cookies.set("lastLoginAs", "", {
    //     httpOnly: true,
    //     secure: process.env.NODE_ENV === "production",
    //     path: "/",
    //     expires: new Date(0), // Expire immédiatement
    //   });

    return response;
}