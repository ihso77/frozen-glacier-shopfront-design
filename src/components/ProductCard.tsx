import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  badge?: string;
  isNew?: boolean;
}

const ProductCard = ({
  name,
  price,
  originalPrice,
  image,
  rating,
  reviews,
  badge,
  isNew,
}: ProductCardProps) => {
  return (
    <div className="group glass-card overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-aurora/10" />
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isNew && (
            <span className="px-3 py-1 rounded-full bg-gradient-to-l from-primary to-aurora text-primary-foreground text-xs font-bold">
              جديد
            </span>
          )}
          {badge && (
            <span className="px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
              {badge}
            </span>
          )}
        </div>

        {/* Quick Add Button */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button className="w-full bg-gradient-to-l from-primary to-aurora text-primary-foreground ice-glow">
            <ShoppingCart className="w-4 h-4 ml-2" />
            أضف للسلة
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {name}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
          <span className="text-muted-foreground text-sm">({reviews})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold gradient-text">{price.toFixed(2)} ر.س</span>
          {originalPrice && (
            <span className="text-muted-foreground line-through text-sm">
              {originalPrice.toFixed(2)} ر.س
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
