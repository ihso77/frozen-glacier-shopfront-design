import { Snowflake } from "lucide-react";

const HeroBanner = () => {
  return (
    <section className="relative min-h-[500px] flex items-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background" />
      <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-aurora/10 rounded-full blur-3xl" />
      
      {/* Floating Ice Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <Snowflake
            key={i}
            className="absolute text-primary/20 animate-float"
            style={{
              width: `${20 + Math.random() * 25}px`,
              height: `${20 + Math.random() * 25}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${5 + Math.random() * 4}s`,
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
              <span className="text-primary text-sm font-medium">أفضل الخدمات الرقمية</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="gradient-text">مرحباً بكم</span>
              <br />
              <span className="text-foreground">في متجر فروزن</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0 lg:mr-0">
              متجرك الموثوق لشراء اليوزرات والاشتراكات الرقمية بأفضل الأسعار وأسرع التسليم
            </p>

            {/* Stats */}
            <div className="flex items-center gap-8 justify-center lg:justify-start">
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">+500</div>
                <div className="text-muted-foreground text-sm">منتج رقمي</div>
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

          {/* Hero Visual */}
          <div className="flex-1 relative">
            <div className="relative w-full max-w-md mx-auto">
              <div className="w-full aspect-square rounded-full bg-gradient-to-br from-primary/20 to-aurora/20 blur-3xl absolute inset-0" />
              <div className="relative glass-card rounded-3xl p-8">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-aurora/10 flex items-center justify-center border border-primary/20">
                  <Snowflake className="w-24 h-24 text-primary/50" />
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
