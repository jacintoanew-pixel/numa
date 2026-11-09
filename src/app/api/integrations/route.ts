import { NextRequest, NextResponse } from "next/server";
import { integrationsVault } from "@/lib/security/integrations-vault";
import { getAuthenticatedUser } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    // Isolate integrations: non-master users (friends/guests) do not access Admin's bot or keys
    if (user.id !== "usr_master_01") {
      return NextResponse.json({
        success: true,
        status: {
          telegram: { isConfigured: false, isSecuredWithUserId: false },
          gemini: { isConfigured: false, model: "gemini-2.5-flash" },
          google: { isConfigured: false },
          apple: { isConfigured: false },
        },
      });
    }

    const status = integrationsVault.getPublicStatus();
    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Error al obtener estado de integraciones" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    // Restrict configuration to master owner account
    if (user.id !== "usr_master_01") {
      return NextResponse.json(
        {
          success: false,
          error: "Las integraciones globales (Telegram y Gemini) solo pueden ser gestionadas por el propietario.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "telegram") {
      const { token, allowedUserId } = body;
      const result = await integrationsVault.configureTelegram(token, allowedUserId);
      return NextResponse.json({
        success: true,
        message: `Bot de Telegram configurado exitosamente para @${result.botUsername}.`,
        data: result,
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (action === "gemini") {
      const { apiKey } = body;
      const result = await integrationsVault.configureGemini(apiKey);
      return NextResponse.json({
        success: true,
        message: "API Key de Google Gemini verificada y guardada.",
        data: result,
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (action === "disconnect_telegram" || action === "disconnect-telegram") {
      integrationsVault.disconnectTelegram();
      return NextResponse.json({
        success: true,
        message: "Bot de Telegram desconfigurado exitosamente.",
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (action === "disconnect_gemini" || action === "disconnect-gemini") {
      integrationsVault.disconnectGemini();
      return NextResponse.json({
        success: true,
        message: "Google Gemini desconfigurado exitosamente.",
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (action === "google_oauth") {
      const { clientId } = body;
      const result = integrationsVault.configureGoogleOAuth(clientId);
      return NextResponse.json({
        success: true,
        message: "Google OAuth 2.0 Client ID configurado exitosamente.",
        data: result,
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (action === "apple_oauth") {
      const { clientId } = body;
      const result = integrationsVault.configureAppleOAuth(clientId);
      return NextResponse.json({
        success: true,
        message: "Apple Services ID configurado exitosamente.",
        data: result,
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (action === "disconnect_google" || action === "disconnect-google") {
      integrationsVault.disconnectGoogleOAuth();
      return NextResponse.json({
        success: true,
        message: "Google OAuth desconfigurado exitosamente.",
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (action === "disconnect_apple" || action === "disconnect-apple") {
      integrationsVault.disconnectAppleOAuth();
      return NextResponse.json({
        success: true,
        message: "Apple Sign In desconfigurado exitosamente.",
        status: integrationsVault.getPublicStatus(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Acción no reconocida." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Integrations API error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al procesar la integración" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    if (user.id !== "usr_master_01") {
      return NextResponse.json(
        {
          success: false,
          error: "Las integraciones globales solo pueden ser modificadas por el propietario.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const target = searchParams.get("target");

    if (target === "telegram") {
      integrationsVault.disconnectTelegram();
      return NextResponse.json({
        success: true,
        message: "Bot de Telegram desconfigurado exitosamente.",
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (target === "gemini") {
      integrationsVault.disconnectGemini();
      return NextResponse.json({
        success: true,
        message: "Google Gemini desconfigurado exitosamente.",
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (target === "google") {
      integrationsVault.disconnectGoogleOAuth();
      return NextResponse.json({
        success: true,
        message: "Google OAuth desconfigurado exitosamente.",
        status: integrationsVault.getPublicStatus(),
      });
    }

    if (target === "apple") {
      integrationsVault.disconnectAppleOAuth();
      return NextResponse.json({
        success: true,
        message: "Apple Sign In desconfigurado exitosamente.",
        status: integrationsVault.getPublicStatus(),
      });
    }

    return NextResponse.json(
      { success: false, error: "Parámetro 'target' inválido. Use 'telegram', 'gemini', 'google' o 'apple'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Integrations DELETE error:", error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || "Error al desconfigurar" },
      { status: 500 }
    );
  }
}
