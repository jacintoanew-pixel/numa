import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
      <div className="mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/numa-icon.png"
          alt="numa"
          className="h-16 w-16 object-contain drop-shadow-md"
        />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ff3b30]/10 text-[#ff3b30] dark:bg-[#ff453a]/15 dark:text-[#ff453a] border border-[#ff3b30]/20 mb-3">
        <span>Error 404</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-white mb-2">
        Página no encontrada
      </h1>

      <p className="text-sm text-[#6e6e73] dark:text-[#86868b] max-w-sm mb-6 leading-relaxed">
        El recurso que buscas no existe o ha sido reubicado por los protocolos de seguridad de numa.
      </p>

      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button className="flex items-center gap-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs">
            <Home className="h-3.5 w-3.5" />
            <span>Volver al Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
