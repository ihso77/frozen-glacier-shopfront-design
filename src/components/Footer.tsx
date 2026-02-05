import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="relative py-12 border-t border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10 group-hover:shadow-primary/30 transition-all duration-300">
              <span className="text-lg">❄️</span>
            </div>
            <span className="text-xl font-bold frozen-logo">فروزن</span>
          </Link>

          {/* Copyright */}
          <p className="text-muted-foreground text-sm">
            © 2026 فروزن. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;