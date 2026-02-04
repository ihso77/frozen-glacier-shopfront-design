import { ShoppingCart, User, Search, Snowflake, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navLinks = [
  { name: "الرئيسية", href: "#" },
  { name: "آيس كريم", href: "#ice-cream" },
  { name: "مثلجات", href: "#frozen" },
  { name: "عصائر", href: "#juices" },
  { name: "حلويات", href: "#desserts" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-primary/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-aurora flex items-center justify-center ice-glow">
              <Snowflake className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold gradient-text">فروزن</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-foreground/80 hover:text-primary transition-colors font-medium relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-foreground/80 hover:text-primary hover:bg-primary/10">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-foreground/80 hover:text-primary hover:bg-primary/10 relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                0
              </span>
            </Button>
            <Button className="hidden sm:flex bg-gradient-to-l from-primary to-aurora text-primary-foreground hover:opacity-90 transition-opacity ice-glow">
              <User className="w-4 h-4 ml-2" />
              تسجيل الدخول
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground/80"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-primary/20">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-foreground/80 hover:text-primary transition-colors font-medium py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <Button className="w-full bg-gradient-to-l from-primary to-aurora text-primary-foreground">
                <User className="w-4 h-4 ml-2" />
                تسجيل الدخول
              </Button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
