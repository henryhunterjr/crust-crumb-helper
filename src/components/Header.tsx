import logo from "@/assets/logo.png";

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container flex h-16 items-center gap-4 px-4">
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
      </div>
    </header>
  );
}
