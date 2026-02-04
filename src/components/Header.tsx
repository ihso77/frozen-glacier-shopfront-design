import { User, Menu, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { name: "الرئيسية", href: "/" },
  { name: "اشتراكات مسلسلات", href: "/#subscriptions" },
  { name: "خدمات عامة", href: "/#services" },
  { name: "اشتراكات دسكورد", href: "/#discord-subs" },
  { name: "خدمات دسكورد", href: "/#discord-services" },
  { name: "خدمات الألعاب", href: "/#games" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-aurora/20 border border-primary/30 flex items-center justify-center">
              <Snowflake className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-black tracking-tight frozen-logo">فروزن</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`px-4 py-2 text-sm font-medium transition-colors relative group ${
                  location.pathname === link.href || (link.href === "/" && location.pathname === "/")
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.name}
                {(location.pathname === link.href || (link.href === "/" && location.pathname === "/")) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button 
                className="hidden sm:flex h-10 px-6 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all"
              >
                <User className="w-4 h-4 ml-2" />
                تسجيل الدخول
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-foreground/80"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium py-2 px-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full mt-2 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20">
                  <User className="w-4 h-4 ml-2" />
                  تسجيل الدخول
                </Button>
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
