import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireSession();
  if (authResult.error) {
    return authResult.error;
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const token = await new SignJWT({
    id: authResult.session!.user.id,
    email: authResult.session!.user.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({ token });
}
