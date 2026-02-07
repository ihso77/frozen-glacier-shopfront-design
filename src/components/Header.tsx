import { User, Menu, Settings, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";

const navLinks = [
  { name: "الرئيسية", href: "/" },
  { name: "يوزرات", href: "/#usernames" },
  { name: "اشتراكات", href: "/#subscriptions" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (data && (data.role === "admin" || data.role === "owner")) {
      setIsAdmin(true);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-lg">❄️</span>
            </div>
            <span className="text-2xl font-black tracking-tight frozen-logo">فروزن</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`px-5 py-2.5 text-sm font-medium transition-all duration-300 relative group rounded-lg ${
                  location.pathname === link.href || (link.href === "/" && location.pathname === "/")
                    ? "text-foreground bg-secondary/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                }`}
              >
                {link.name}
                {(location.pathname === link.href || (link.href === "/" && location.pathname === "/")) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-lg shadow-primary/50" />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <CartButton />

            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin">
                    <Button 
                      className="hidden sm:flex h-9 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      لوحة الإدارة
                    </Button>
                  </Link>
                )}
                <Button 
                  onClick={handleLogout}
                  className="hidden sm:flex h-9 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all duration-300"
                >
                  تسجيل الخروج
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button 
                  className="hidden sm:flex h-9 px-5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 gap-2"
                >
                  <User className="w-4 h-4" />
                  تسجيل الدخول
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-foreground/80 hover:bg-secondary/50"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-border/30 animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-muted-foreground hover:text-foreground transition-colors font-medium py-3 px-4 rounded-lg hover:bg-secondary/50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full mt-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground gap-2">
                        <Settings className="w-4 h-4" />
                        لوحة الإدارة
                      </Button>
                    </Link>
                  )}
                  <Button 
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="w-full mt-2 rounded-xl bg-primary/10 border border-primary/30 text-primary"
                  >
                    تسجيل الخروج
                  </Button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full mt-2 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground gap-2">
                    <User className="w-4 h-4" />
                    تسجيل الدخول
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

const CartButton = () => {
  const { totalItems, setIsOpen } = useCart();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-300"
    >
      <ShoppingBag className="w-5 h-5" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
          {totalItems}
        </span>
      )}
    </button>
  );
};

export default Header;