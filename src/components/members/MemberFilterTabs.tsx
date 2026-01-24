import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MemberFilter } from '@/types/member';

interface MemberFilterTabsProps {
  activeFilter: MemberFilter;
  onFilterChange: (filter: MemberFilter) => void;
  counts: {
    all: number;
    never_engaged: number;
    at_risk: number;
    inactive: number;
    needs_outreach: number;
    has_goals: number;
    no_goals: number;
  };
}

export function MemberFilterTabs({ activeFilter, onFilterChange, counts }: MemberFilterTabsProps) {
  const filters: { id: MemberFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'never_engaged', label: 'Never Engaged', count: counts.never_engaged },
    { id: 'at_risk', label: 'At Risk', count: counts.at_risk },
    { id: 'inactive', label: 'Inactive 30+', count: counts.inactive },
    { id: 'needs_outreach', label: 'Needs Outreach', count: counts.needs_outreach },
    { id: 'has_goals', label: 'Has Learning Goals', count: counts.has_goals },
    { id: 'no_goals', label: 'No Goals', count: counts.no_goals },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
            activeFilter === filter.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {filter.label}
          <Badge 
            variant={activeFilter === filter.id ? "secondary" : "outline"} 
            className="h-5 min-w-[20px] flex items-center justify-center text-xs"
          >
            {filter.count}
          </Badge>
        </button>
      ))}
    </div>
  );
}
