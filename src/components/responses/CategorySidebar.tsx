import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/types/quickResponse";
import { 
  Beaker, 
  Wrench, 
  BookOpen, 
  Lightbulb, 
  Wheat,
  Compass,
  ShoppingBag,
  LayoutGrid
} from "lucide-react";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Sourdough Starter": Beaker,
  "Troubleshooting": Wrench,
  "Equipment": Lightbulb,
  "Techniques": BookOpen,
  "Ingredients": Wheat,
  "Getting Started": Compass,
  "Affiliate Recommendations": ShoppingBag,
};

interface CategorySidebarProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  responseCounts: Record<string, number>;
}

export function CategorySidebar({ 
  selectedCategory, 
  onSelectCategory, 
  responseCounts 
}: CategorySidebarProps) {
  const totalCount = Object.values(responseCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-1">
      <Button
        variant={selectedCategory === null ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-10",
          selectedCategory === null && "bg-accent text-accent-foreground"
        )}
        onClick={() => onSelectCategory(null)}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="flex-1 text-left">All Responses</span>
        <span className="text-xs text-muted-foreground">{totalCount}</span>
      </Button>
      
      <div className="h-px bg-border my-3" />
      
      {CATEGORIES.map((category) => {
        const Icon = categoryIcons[category] || BookOpen;
        const count = responseCounts[category] || 0;
        
        return (
          <Button
            key={category}
            variant={selectedCategory === category ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-10",
              selectedCategory === category && "bg-accent text-accent-foreground"
            )}
            onClick={() => onSelectCategory(category)}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1 text-left truncate">{category}</span>
            <span className="text-xs text-muted-foreground">{count}</span>
          </Button>
        );
      })}
    </div>
  );
}
