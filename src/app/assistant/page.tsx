"use client";

import * as React from "react";
import { Send, Bot, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFinancialStore } from "@/components/providers/financial-store-provider";
import { useSecurity } from "@/components/providers/security-provider";

interface Message {
  id: string;
  sender: "user" | "gemini";
  text: string;
  time: string;
  source?: "gemini" | "local-fallback";
  toolsUsed?: string[];
}

const PROMPT_SUGGESTIONS = [
  "¿Cuánto he gastado este mes?",
  "¿Cómo van mis metas de ahorro?",
  "¿Cómo está el estado de mis presupuestos?",
  "Gasto de $15.50 en Almuerzo ejecutivo",
];

function FormattedMessageText({ text }: { text: string }) {
  // Strip any accidental triple asterisks or raw formatting markers
  const sanitized = text.replace(/\*\*\*/g, "**");
  const lines = sanitized.split("\n");

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ");
        const content = isBullet ? trimmed.replace(/^[-•*]\s+/, "") : line;

        // Clean bold **text** or *text* into clean React nodes
        const parts = content.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g);
        const rendered = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} className="font-semibold text-[#1d1d1f] dark:text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
            return (
              <span key={pIdx} className="font-medium text-[#1d1d1f] dark:text-white">
                {part.slice(1, -1)}
              </span>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="text-[#0071e3] dark:text-[#2997ff] select-none shrink-0 font-bold">•</span>
              <div className="flex-1 text-inherit">{rendered}</div>
            </div>
          );
        }

        return <p key={idx} className="text-inherit">{rendered}</p>;
      })}
    </div>
  );
}

export default function AssistantPage() {
  const { accounts, syncServerState } = useFinancialStore();
  const { session } = useSecurity();

  const firstName = React.useMemo(() => {
    const raw = session?.name?.trim();
    if (!raw || raw === "Sesión Cerrada") return "Usuario";
    return raw.split(/\s+/)[0];
  }, [session?.name]);

  const userInitials = React.useMemo(() => {
    const raw = session?.name?.trim();
    if (!raw || raw === "Sesión Cerrada") return "U";
    const parts = raw.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }, [session?.name]);

  const welcomeText = React.useMemo(() => {
    const cleanNames = accounts
      .map((a) => a.name.split("—")[0].trim())
      .filter(Boolean);

    const isMaster = session?.id === "usr_master_01";

    if (cleanNames.length === 0) {
      return `¡Hola, ${firstName}! Soy tu asistente financiero en numa. Aún no tienes cuentas registradas; puedes agregar una desde Ajustes o el Dashboard para comenzar a llevar el control de tus movimientos.`;
    }

    if (cleanNames.length === 1) {
      return `¡Hola, ${firstName}! Soy tu asistente financiero personal en numa. Actualmente tienes activa tu cuenta de ${cleanNames[0]}. Puedo ayudarte a registrar ingresos o gastos, consultar tu saldo disponible o revisar tus presupuestos y metas. ¿En qué te ayudo hoy?`;
    }

    const joinedAccounts = `${cleanNames.slice(0, -1).join(", ")} y ${cleanNames[cleanNames.length - 1]}`;

    if (isMaster) {
      return `¡Hola, ${firstName}! Aquí tienes el control de tu dinero al día. Puedo darte el saldo de tus cuentas (${joinedAccounts}), registrar cualquier gasto al momento o revisar cómo vamos con los presupuestos del mes. ¿Qué revisamos hoy?`;
    }

    return `¡Hola, ${firstName}! Soy tu asistente financiero personal en numa. Tienes activas tus cuentas (${joinedAccounts}). Puedo consultar tus saldos, registrar cualquier ingreso o gasto al instante o revisar tus presupuestos. ¿En qué trabajamos hoy?`;
  }, [firstName, accounts, session?.id]);

  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "m-welcome",
      sender: "gemini",
      text: welcomeText,
      time: "Ahora",
      source: "gemini",
    },
  ]);

  // Keep welcome message synchronized with active user and their accounts
  React.useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => (m.id === "m-welcome" ? { ...m, text: welcomeText } : m))
    );
  }, [welcomeText]);

  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [interactionId, setInteractionId] = React.useState<string | undefined>();
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const submitPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `m-user-${Date.now()}`,
      sender: "user",
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          userId: session?.id || "usr_master_01",
          previousInteractionId: interactionId,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.interactionId) {
        setInteractionId(data.interactionId);
      }

      // Sync state directly from server to update balances without duplicating
      if (Array.isArray(data.toolCalls) && data.toolCalls.length > 0) {
        syncServerState();
      }

      const toolsUsed = data.toolCalls?.map((tc: any) => tc.name) || [];

      const assistantMsg: Message = {
        id: `m-gemini-${Date.now()}`,
        sender: "gemini",
        text: data.text || "Consulta completada con éxito.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: data.source,
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-error-${Date.now()}`,
          sender: "gemini",
          text: `No se pudo conectar con el servicio: ${err?.message || "Error desconocido"}. Verifica tu conexión.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          source: "local-fallback",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    submitPrompt(input);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-2">
            Asistente Personal <Sparkles className="h-5 w-5 text-[#0071e3] dark:text-[#2997ff]" />
          </h2>
          <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-[#86868b]">
            Consultas, registro de movimientos y sugerencias sobre tu patrimonio personal.
          </p>
        </div>
        <Badge variant="default" className="text-xs self-start sm:self-center">
          Asistente Activo
        </Badge>
      </div>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-[#6e6e73] dark:text-[#86868b] shrink-0">Sugerencias:</span>
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => submitPrompt(suggestion)}
            disabled={loading}
            className="text-xs bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] border border-[#e8e8ed] dark:border-white/10 text-[#1d1d1f] dark:text-[#e5e5ea] px-3.5 py-1.5 rounded-full transition-colors shrink-0 disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <Card className="bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)] flex flex-col h-[600px] overflow-hidden">
        {/* Messages list */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#2997ff] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-[#0071e3] text-white rounded-br-none border border-[#0071e3]/40 shadow-sm"
                      : "bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.08] text-[#1d1d1f] dark:text-[#f5f5f7] rounded-bl-none shadow-xs"
                  }`}
                >
                  <FormattedMessageText text={msg.text} />

                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-[#e8e8ed] dark:border-white/10 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-[#1D8348] dark:text-[#30D158] font-medium flex items-center gap-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#1D8348] dark:text-[#30D158]" />
                        Movimiento registrado en base de datos
                      </span>
                    </div>
                  )}

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    {!isUser && msg.source && (
                      <span className="text-[10px] text-[#6e6e73] dark:text-[#86868b] font-medium">
                        {msg.source === "gemini" ? "Asistente numa" : "Modo Local Fallback"}
                      </span>
                    )}
                    <span
                      className={`text-[10px] ${isUser ? "text-white/80 ml-auto" : "text-[#6e6e73] dark:text-[#86868b] ml-auto"}`}
                      suppressHydrationWarning
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>

                {isUser && (
                  <div className="h-8 w-8 rounded-full bg-[#0071e3] text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 shadow-sm overflow-hidden">
                    {session?.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={session.avatarUrl}
                        alt={session.name || "Usuario"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      userInitials
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#0071e3] to-[#2997ff] flex items-center justify-center text-white shrink-0 shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-[#f5f5f7] dark:bg-[#262629] border border-[#e8e8ed] dark:border-white/[0.08] rounded-2xl p-3 text-xs text-[#6e6e73] dark:text-[#86868b] flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-[#0071e3] dark:text-[#2997ff]" />
                <span>Consultando con Asistente numa...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-[#e8e8ed] dark:border-white/[0.08] bg-white/80 dark:bg-[#121214]/60 backdrop-blur-xl">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Haz una pregunta financiera... ej. '¿Cuánto me queda de presupuesto de comida?'"
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-full border border-[#e8e8ed] dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:border-[#0071e3] bg-black/[0.03] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white placeholder:text-[#6e6e73] dark:placeholder:text-[#86868b] transition-all"
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              size="default"
              className="rounded-full px-5 bg-[#0071e3] hover:bg-[#0066cc] text-white"
              disabled={loading || !input.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
