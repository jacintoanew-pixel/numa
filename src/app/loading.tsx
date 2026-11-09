import * as React from "react";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse max-w-7xl mx-auto">
      {/* Top Banner Skeleton */}
      <div className="h-20 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.06]" />

      {/* Hero Balance Card Skeleton */}
      <div className="h-64 rounded-2xl md:rounded-[22px] bg-black/[0.04] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.06] p-6 space-y-4">
        <div className="h-4 w-36 rounded-md bg-black/[0.06] dark:bg-white/[0.08]" />
        <div className="h-12 w-64 rounded-xl bg-black/[0.08] dark:bg-white/[0.1]" />
        <div className="flex gap-2 pt-2">
          <div className="h-9 w-28 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="h-9 w-28 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
          <div className="h-9 w-28 rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
        </div>
      </div>

      {/* 3 KPI Cells Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-28 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.06]" />
        <div className="h-28 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.06]" />
      </div>

      {/* 2-column Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-80 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.06]" />
        <div className="lg:col-span-4 h-80 rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] border border-[#e8e8ed] dark:border-white/[0.06]" />
      </div>
    </div>
  );
}
