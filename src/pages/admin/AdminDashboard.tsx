import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Package, ShoppingCart, TrendingUp, Eye } from "lucide-react";

interface Stats {
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
  recentEvents: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProducts: 0,
    totalCategories: 0,
    recentEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Fetch products count
      const { count: productsCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      // Fetch categories count
      const { count: categoriesCount } = await supabase
        .from("categories")
        .select("*", { count: "exact", head: true });

      // Fetch recent analytics events (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: eventsCount } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", yesterday.toISOString());

      setStats({
        totalUsers: usersCount || 0,
        totalProducts: productsCount || 0,
        totalCategories: categoriesCount || 0,
        recentEvents: eventsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "إجمالي المستخدمين",
      value: stats.totalUsers,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "إجمالي المنتجات",
      value: stats.totalProducts,
      icon: Package,
      color: "text-aurora",
      bgColor: "bg-aurora/10",
    },
    {
      title: "الأقسام",
      value: stats.totalCategories,
      icon: ShoppingCart,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "الزيارات (24 ساعة)",
      value: stats.recentEvents,
      icon: Eye,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-secondary rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-secondary rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على إحصائيات المتجر</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="glass-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">إجراءات سريعة</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a 
            href="/admin/products"
            className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors text-center"
          >
            <Package className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-medium text-foreground">إضافة منتج جديد</p>
          </a>
          <a 
            href="/admin/users"
            className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors text-center"
          >
            <Users className="w-8 h-8 text-aurora mx-auto mb-2" />
            <p className="font-medium text-foreground">إدارة المستخدمين</p>
          </a>
          <a 
            href="/admin/settings"
            className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors text-center"
          >
            <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-medium text-foreground">إعدادات الموقع</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
