import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "El inicio de sesión con Apple está deshabilitado.",
      code: "FEATURE_DISABLED",
    },
    { status: 403 }
  );
}
