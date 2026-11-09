import * as React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

interface AiInsightBannerProps {
  title: string;
  summary: string;
  generatedAt: string;
}

export function AiInsightBanner({ title, summary }: AiInsightBannerProps) {
  return (
    <div className="p-3 sm:p-3.5 lg:px-4 lg:py-3 rounded-2xl md:rounded-[18px] bg-white dark:bg-[#272729] border border-[#e8e8ed] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.3)] flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-4 transition-all hover:border-[#d2d2d7] dark:hover:border-white/[0.14]">
      {/* Insight Content */}
      <div className="flex items-start md:items-center gap-3 min-w-0 flex-1">
        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-[#0071e3]/10 dark:bg-[#0071e3]/20 text-[#0071e3] dark:text-[#2997ff] border border-[#0071e3]/20 dark:border-[#0071e3]/30 flex items-center justify-center shrink-0">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="text-xs sm:text-[13px] text-[#1d1d1f] dark:text-[#f5f5f7] leading-snug">
          <strong className="text-[#1d1d1f] dark:text-white font-semibold">
            {title ? `${title}:` : "Lectura inteligente:"}{" "}
          </strong>
          <span>{summary}</span>
        </div>
      </div>

      {/* Action link */}
      <div className="flex items-center gap-3 shrink-0 pl-10 md:pl-0">
        <span className="text-[11px] text-[#6e6e73] dark:text-[#86868b] hidden xl:inline">
          Gemini 3.8 Flash • En tiempo real
        </span>
        <Link
          href="/assistant"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0071e3] dark:text-[#2997ff] hover:text-[#0066cc] transition-colors whitespace-nowrap"
        >
          <span>Consultar Asistente</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

