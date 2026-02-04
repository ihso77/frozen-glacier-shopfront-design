import { Snowflake } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="relative py-12 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-aurora/20 border border-primary/30 flex items-center justify-center">
              <Snowflake className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold frozen-logo">فروزن</span>
          </Link>

          {/* Copyright */}
          <p className="text-muted-foreground text-sm">
            © 2024 فروزن. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
