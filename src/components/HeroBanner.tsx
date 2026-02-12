import { Sparkles, Shield, Zap } from "lucide-react";

const HeroBanner = () => {
  return (
    <section className="relative min-h-[520px] flex items-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/10 to-background" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/8 rounded-full blur-[130px]" />
      
      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(195 100% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(195 100% 50% / 0.3) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/20 animate-float"
            style={{
              width: `${4 + Math.random() * 8}px`,
              height: `${4 + Math.random() * 8}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + Math.random() * 6}s`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text Content */}
          <div className="flex-1 text-center lg:text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-medium">أفضل الخدمات الرقمية</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
              <span className="gradient-text">مرحباً بكم</span>
              <br />
              <span className="text-foreground">في متجر </span>
              <span className="frozen-logo text-4xl md:text-5xl lg:text-7xl">فروزن</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-lg mx-auto lg:mx-0 lg:mr-0 leading-relaxed">
              متجرك الموثوق لشراء اليوزرات والاشتراكات الرقمية بأفضل الأسعار وأسرع التسليم
            </p>

            {/* Feature Tags */}
            <div className="flex flex-wrap items-center gap-3 justify-center lg:justify-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 border border-border/50 backdrop-blur-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground font-medium">تسليم فوري</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 border border-border/50 backdrop-blur-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground font-medium">آمن 100%</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/50 border border-border/50 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground font-medium">+1K طلب مكتمل</span>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="flex-1 relative hidden lg:block">
            <div className="relative w-full max-w-md mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-[80px] scale-150" />
              <div className="relative">
                {/* Floating Cards */}
                <div className="glass-card p-6 rounded-2xl animate-float" style={{ animationDuration: "5s" }}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                      <span className="text-2xl">❄️</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">متجر فروزن</h3>
                      <p className="text-xs text-muted-foreground">خدمات رقمية متميزة</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 bg-gradient-to-r from-primary/30 to-accent/20 rounded-full w-3/4" />
                    <div className="h-2 bg-secondary/50 rounded-full w-1/2" />
                    <div className="flex items-center gap-2 pt-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20" />
                      <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20" />
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20" />
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 glass-card p-3 rounded-xl animate-float" style={{ animationDelay: "1.5s", animationDuration: "6s" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 text-sm">✓</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">تم التسليم</p>
                      <p className="text-xs text-muted-foreground">قبل 3 دقائق</p>
                    </div>
                  </div>
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
