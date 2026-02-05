import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import Footer from "@/components/Footer";
import SnowBackground from "@/components/SnowBackground";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { User, CreditCard } from "lucide-react";

const Index = () => {
  // Fetch categories from database
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch products from database
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    }
  });

  // تجميع المنتجات حسب القسم
  const productsByCategory = categories?.reduce((acc, category) => {
    acc[category.id] = products?.filter(p => p.category_id === category.id) || [];
    return acc;
  }, {} as Record<string, typeof products>);

  const getCategoryIcon = (icon: string | null) => {
    switch (icon) {
      case 'user':
        return <User className="w-6 h-6 text-primary" />;
      case 'credit-card':
        return <CreditCard className="w-6 h-6 text-primary" />;
      default:
        return <span className="text-2xl">📦</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <SnowBackground />
      <div className="relative z-10">
        <Header />
        <HeroBanner />
        
        {/* Products by Category */}
        {categories?.map((category) => {
          const categoryProducts = productsByCategory?.[category.id] || [];
          
          return (
            <section 
              key={category.id} 
              id={category.icon === 'user' ? 'usernames' : 'subscriptions'}
              className="py-16 container mx-auto px-4"
            >
              {/* عنوان القسم */}
              <div className="flex items-center justify-center gap-4 mb-12">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/50" />
                <div className="flex items-center gap-3 px-6 py-3 glass-card">
                  {getCategoryIcon(category.icon)}
                  <h2 className="text-2xl md:text-3xl font-bold gradient-text">
                    {category.name}
                  </h2>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/50" />
              </div>

              {categoryProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categoryProducts.map((product) => (
                    <div
                      key={product.id}
                      className="product-card group"
                    >
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-40 object-cover rounded-xl mb-4 group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-secondary/50 to-secondary/30 rounded-xl mb-4 flex items-center justify-center border border-border/30">
                          <span className="text-5xl opacity-50">📦</span>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-foreground line-clamp-2">{product.name}</h3>
                        {product.badge && (
                          <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary whitespace-nowrap border border-primary/30">
                            {product.badge}
                          </span>
                        )}
                      </div>
                      
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t border-border/30">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-primary">
                            {product.price} ر.ع
                          </span>
                          {product.original_price && (
                            <span className="text-sm text-muted-foreground line-through">
                              {product.original_price} ر.ع
                            </span>
                          )}
                        </div>
                        {product.is_new && (
                          <span className="px-2 py-1 text-xs rounded-full bg-accent/20 text-accent border border-accent/30">
                            جديد
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-12 text-center">
                  <div className="text-5xl mb-4 opacity-50">📦</div>
                  <p className="text-muted-foreground">لا توجد منتجات في هذا القسم حالياً</p>
                </div>
              )}
            </section>
          );
        })}

        {(!categories || categories.length === 0) && (
          <section className="py-16 container mx-auto px-4">
            <div className="glass-card p-12 text-center">
              <div className="text-5xl mb-4 opacity-50">❄️</div>
              <p className="text-muted-foreground">جاري تحميل الأقسام...</p>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </div>
  );
};

export default Index;