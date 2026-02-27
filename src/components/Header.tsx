import { Link, useLocation } from 'react-router-dom';
import logo from "@/assets/logo.png";
import { cn } from '@/lib/utils';
import { Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/members', label: 'Members' },
  { href: '/outreach-queue', label: 'Queue' },
  { href: '/smart-search', label: 'Search' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/email-campaigns', label: 'Email' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/responses', label: 'Responses' },
  { href: '/outreach-log', label: 'Log' },
];

export function Header() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

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
                  aria-label="Settings"
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

          {user && (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-border">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || 'User'} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sign out"
                    onClick={signOut}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
