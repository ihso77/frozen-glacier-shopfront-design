import { Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroBanner = () => {
  return (
    <section className="relative min-h-[600px] flex items-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/30 to-background" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-aurora/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Floating Snowflakes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <Snowflake
            key={i}
            className="absolute text-primary/30 animate-float"
            style={{
              width: `${20 + Math.random() * 30}px`,
              height: `${20 + Math.random() * 30}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Snowflake className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">توصيل سريع ومجاني</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="gradient-text">مرحباً بكم</span>
              <br />
              <span className="text-foreground">في عالم فروزن</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0 lg:mr-0">
              أشهى أنواع الآيس كريم والمثلجات الطازجة، تصلك طازجة ومثلجة إلى باب منزلك
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-gradient-to-l from-primary to-aurora text-primary-foreground text-lg px-8 ice-glow hover:opacity-90 transition-opacity">
                تسوق الآن
              </Button>
              <Button size="lg" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 text-lg px-8">
                تصفح الأقسام
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start">
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">+500</div>
                <div className="text-muted-foreground text-sm">منتج متنوع</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">+10K</div>
                <div className="text-muted-foreground text-sm">عميل سعيد</div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">24/7</div>
                <div className="text-muted-foreground text-sm">دعم فني</div>
              </div>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="flex-1 relative">
            <div className="relative w-full max-w-md mx-auto">
              <div className="w-full aspect-square rounded-full bg-gradient-to-br from-primary/30 to-aurora/30 blur-3xl absolute inset-0" />
              <div className="relative glass-card rounded-3xl p-8 ice-glow">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-aurora/20 flex items-center justify-center">
                  <Snowflake className="w-32 h-32 text-primary animate-pulse" />
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br from-primary to-aurora flex items-center justify-center ice-glow">
                  <span className="text-primary-foreground font-bold text-sm">جديد!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
