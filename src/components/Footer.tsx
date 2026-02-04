import { Snowflake, Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Footer = () => {
  return (
    <footer className="relative pt-20 pb-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-secondary/40 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Newsletter Section */}
        <div className="glass-card p-8 md:p-12 mb-16 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-aurora/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              اشترك في نشرتنا البريدية
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              كن أول من يعرف عن العروض الحصرية والمنتجات الجديدة
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="بريدك الإلكتروني"
                className="bg-background/50 border-primary/30 text-right"
              />
              <Button className="bg-gradient-to-l from-primary to-aurora text-primary-foreground ice-glow whitespace-nowrap">
                اشترك الآن
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-aurora flex items-center justify-center ice-glow">
                <Snowflake className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold gradient-text">فروزن</span>
            </div>
            <p className="text-muted-foreground mb-4">
              متجرك المفضل للآيس كريم والمثلجات الطازجة. نقدم أفضل المنتجات بأعلى جودة.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-foreground mb-4">روابط سريعة</h4>
            <ul className="space-y-3">
              {["الرئيسية", "المنتجات", "العروض", "من نحن", "اتصل بنا"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-bold text-foreground mb-4">الأقسام</h4>
            <ul className="space-y-3">
              {["آيس كريم", "مثلجات", "عصائر", "حلويات", "وجبات خفيفة"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-foreground mb-4">تواصل معنا</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-5 h-5 text-primary" />
                <span dir="ltr">+966 50 123 4567</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-5 h-5 text-primary" />
                <span>info@frozen.sa</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                <span>الرياض، المملكة العربية السعودية</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-8 text-center">
          <p className="text-muted-foreground text-sm">
            © 2024 فروزن. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
