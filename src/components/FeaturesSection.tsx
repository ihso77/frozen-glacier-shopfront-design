import { Truck, Shield, Clock, Headphones } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "توصيل سريع",
    description: "توصيل مجاني للطلبات أكثر من 100 ر.س",
  },
  {
    icon: Shield,
    title: "ضمان الجودة",
    description: "منتجات طازجة ومضمونة 100%",
  },
  {
    icon: Clock,
    title: "خدمة 24/7",
    description: "نحن متواجدون على مدار الساعة",
  },
  {
    icon: Headphones,
    title: "دعم فني",
    description: "فريق دعم متميز لخدمتكم",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="glass-card p-6 text-center group hover:border-primary/50 transition-all duration-300"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-aurora/20 flex items-center justify-center group-hover:from-primary group-hover:to-aurora transition-all duration-300">
                <feature.icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
