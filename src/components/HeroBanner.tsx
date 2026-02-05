const HeroBanner = () => {
  return (
    <section className="relative min-h-[450px] flex items-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/10 to-background" />
      <div className="absolute top-10 right-10 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
      
      {/* Floating Ice Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute text-white/10 animate-float"
            style={{
              fontSize: `${16 + Math.random() * 20}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${5 + Math.random() * 4}s`,
            }}
          >
            ❄
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6 backdrop-blur-sm">
              <span className="text-sm">❄️</span>
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
                <div className="text-3xl font-bold gradient-text">+1K</div>
                <div className="text-muted-foreground text-sm">طلب مكتمل</div>
              </div>
              <div className="w-px h-12 bg-border/50" />
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">آمن</div>
                <div className="text-muted-foreground text-sm">100%</div>
              </div>
              <div className="w-px h-12 bg-border/50" />
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text">فوري</div>
                <div className="text-muted-foreground text-sm">تسليم</div>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="flex-1 relative">
            <div className="relative w-full max-w-sm mx-auto">
              <div className="w-full aspect-square rounded-full bg-gradient-to-br from-primary/15 to-accent/15 blur-3xl absolute inset-0" />
              <div className="relative glass-card rounded-3xl p-8 animate-pulse-glow">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-primary/20">
                  <span className="text-8xl">❄️</span>
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