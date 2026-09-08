"use client";

// 1. External imports
import { ChevronDown, Search } from "lucide-react";

// 2. Internal imports
import type { SortOption } from "@/components/find-jobs/sort-jobs";

// 3. Type definitions
type Props = {
  sortBy: SortOption;
  onSortChange: (sortBy: SortOption) => void;
};

// 4. Component
export function JobFilters({ sortBy, onSortChange }: Props) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Filter by company or role..."
          className="w-full rounded-md border border-transparent bg-transparent py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            defaultValue="all"
            className="appearance-none rounded-md border border-border bg-surface py-2 pr-9 pl-3 text-sm font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          >
            <option value="all">All Matches</option>
            <option value="high">High Match</option>
            <option value="low">Low Match</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(event) => onSortChange(event.target.value as SortOption)}
            className="appearance-none rounded-md border border-border bg-surface py-2 pr-9 pl-3 text-sm font-medium text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          >
            <option value="matchScore">Match Score</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      </div>
    </div>
  );
}
