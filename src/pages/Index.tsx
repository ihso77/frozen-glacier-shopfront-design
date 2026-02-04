import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroBanner />
      
      {/* Categories Section */}
      <section className="py-16 container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 gradient-text">
          أقسام المتجر
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories?.map((category) => (
            <div
              key={category.id}
              className="glass-card p-6 text-center hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="text-primary text-2xl">
                  {category.icon === 'tv' && '📺'}
                  {category.icon === 'package' && '📦'}
                  {category.icon === 'message-circle' && '💬'}
                  {category.icon === 'users' && '👥'}
                  {category.icon === 'gamepad-2' && '🎮'}
                </span>
              </div>
              <h3 className="font-semibold text-foreground text-sm">{category.name}</h3>
            </div>
          ))}
        </div>

        {(!categories || categories.length === 0) && (
          <p className="text-center text-muted-foreground">لا توجد أقسام حالياً</p>
        )}
      </section>

      {/* Products Section */}
      {products && products.length > 0 && (
        <section className="py-16 container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 gradient-text">
            المنتجات المتاحة
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="glass-card p-4 hover:border-primary/50 transition-all"
              >
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full h-40 bg-secondary/50 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-4xl">📦</span>
                  </div>
                )}
                
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground line-clamp-2">{product.name}</h3>
                  {product.badge && (
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary whitespace-nowrap">
                      {product.badge}
                    </span>
                  )}
                </div>
                
                {product.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
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
                    <span className="px-2 py-1 text-xs rounded-full bg-aurora/20 text-aurora">
                      جديد
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Index;
