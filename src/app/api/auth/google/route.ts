import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "El inicio de sesión con Google estará disponible próximamente en una futura versión institucional.",
      code: "FEATURE_UPCOMING",
    },
    { status: 403 }
  );
}
