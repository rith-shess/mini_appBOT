import React from 'react';
import {
  Monitor,
  Scan,
  Printer,
  Tag,
  Layers,
  FileText,
  Wrench,
  LayoutGrid,
} from 'lucide-react';
import { Category, CategoryId } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface CategoryPillsProps {
  categories: Category[];
  selectedCategoryId: CategoryId | 'all';
  onSelectCategory: (id: CategoryId | 'all') => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Monitor,
  Scan,
  Printer,
  Tag,
  Layers,
  FileText,
  Wrench,
};

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const { language, t } = useTranslation();

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none no-scrollbar -mx-4 px-4">
      {/* "All" pill */}
      <button
        onClick={() => onSelectCategory('all')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all focus:outline-none active:scale-95 shrink-0 ${
          selectedCategoryId === 'all'
            ? 'bg-navy-900 text-white shadow-sm'
            : 'bg-white border border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>{t.common.all}</span>
      </button>

      {/* Individual category pills */}
      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        const IconComponent = iconMap[cat.iconName] || Monitor;
        const name = cat.name[language] || cat.name.en;

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all focus:outline-none active:scale-95 shrink-0 ${
              isSelected
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-slate-200/90 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-brand-600'}`} />
            <span>{name}</span>
            {cat.itemCount !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {cat.itemCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
