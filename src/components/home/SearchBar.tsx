import React from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  resultCount?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, resultCount }) => {
  const { t } = useTranslation();

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t.common.searchPlaceholder}
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-navy-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all shadow-subtle"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 focus:outline-none"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {value && resultCount !== undefined && (
        <div className="mt-1.5 px-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Found {resultCount} matching hardware {resultCount === 1 ? 'item' : 'items'}</span>
          <button
            onClick={() => onChange('')}
            className="text-brand-600 font-semibold hover:underline"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};
