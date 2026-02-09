import { Link, useLocation } from 'react-router-dom';
import logo from "@/assets/logo.png";
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/responses', label: 'Responses' },
  { href: '/generate', label: 'Generate' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/members', label: 'Members' },
  { href: '/outreach-log', label: 'Outreach' },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-4">
          <img 
            src={logo} 
            alt="Crust & Crumb Academy" 
            className="h-12 w-auto"
          />
          <div className="flex flex-col">
            <h1 className="font-serif text-lg font-bold text-foreground leading-tight">
              Community Manager
            </h1>
            <p className="text-xs text-muted-foreground">
              Crust & Crumb Academy
            </p>
          </div>
        </Link>

        <nav className="ml-auto flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                location.pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {item.label}
            </Link>
          ))}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/settings">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "ml-2",
                    location.pathname === '/settings'
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </nav>
      </div>
    </header>
  );
}
