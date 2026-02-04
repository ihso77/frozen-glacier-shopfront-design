import { ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "./ProductCard";

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  badge?: string;
  isNew?: boolean;
}

interface CategorySectionProps {
  title: string;
  description: string;
  products: Product[];
  icon?: React.ReactNode;
}

const CategorySection = ({ title, description, products, icon }: CategorySectionProps) => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-aurora flex items-center justify-center ice-glow flex-shrink-0">
              {icon || <Sparkles className="w-7 h-7 text-primary-foreground" />}
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{title}</h2>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
            عرض الكل
            <ChevronLeft className="w-4 h-4 mr-2" />
          </Button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
