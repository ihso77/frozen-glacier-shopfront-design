import { IceCream, Snowflake, GlassWater, Cake } from "lucide-react";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import CategorySection from "@/components/CategorySection";
import FeaturesSection from "@/components/FeaturesSection";
import Footer from "@/components/Footer";

import iceCream1 from "@/assets/ice-cream-1.jpg";
import iceCream2 from "@/assets/ice-cream-2.jpg";
import iceCream3 from "@/assets/ice-cream-3.jpg";
import iceCream4 from "@/assets/ice-cream-4.jpg";
import popsicle1 from "@/assets/popsicle-1.jpg";
import smoothie1 from "@/assets/smoothie-1.jpg";
import dessert1 from "@/assets/dessert-1.jpg";
import frozenYogurt1 from "@/assets/frozen-yogurt-1.jpg";

const iceCreamProducts = [
  {
    id: 1,
    name: "آيس كريم فانيلا فاخر",
    price: 25.00,
    originalPrice: 35.00,
    image: iceCream1,
    rating: 5,
    reviews: 128,
    badge: "-30%",
    isNew: true,
  },
  {
    id: 2,
    name: "آيس كريم شوكولاتة بلجيكية",
    price: 28.00,
    image: iceCream2,
    rating: 5,
    reviews: 95,
    isNew: true,
  },
  {
    id: 3,
    name: "آيس كريم فراولة طازجة",
    price: 24.00,
    image: iceCream3,
    rating: 4,
    reviews: 76,
  },
  {
    id: 4,
    name: "آيس كريم فستق سوري",
    price: 32.00,
    image: iceCream4,
    rating: 5,
    reviews: 142,
    badge: "الأكثر مبيعاً",
  },
];

const frozenProducts = [
  {
    id: 5,
    name: "مثلجات فواكه مشكلة",
    price: 18.00,
    image: popsicle1,
    rating: 4,
    reviews: 67,
    isNew: true,
  },
  {
    id: 6,
    name: "فروزن يوغرت توت",
    price: 22.00,
    originalPrice: 28.00,
    image: frozenYogurt1,
    rating: 5,
    reviews: 89,
    badge: "-20%",
  },
  {
    id: 7,
    name: "باريه فواكه استوائية",
    price: 15.00,
    image: popsicle1,
    rating: 4,
    reviews: 54,
  },
  {
    id: 8,
    name: "سوربيه مانجو",
    price: 20.00,
    image: frozenYogurt1,
    rating: 5,
    reviews: 102,
  },
];

const juiceProducts = [
  {
    id: 9,
    name: "سموذي مانجو طازج",
    price: 16.00,
    image: smoothie1,
    rating: 5,
    reviews: 234,
    isNew: true,
  },
  {
    id: 10,
    name: "عصير فواكه استوائية",
    price: 14.00,
    image: smoothie1,
    rating: 4,
    reviews: 156,
  },
  {
    id: 11,
    name: "ميلك شيك فراولة",
    price: 18.00,
    originalPrice: 24.00,
    image: smoothie1,
    rating: 5,
    reviews: 189,
    badge: "-25%",
  },
  {
    id: 12,
    name: "سموذي توت مشكل",
    price: 17.00,
    image: smoothie1,
    rating: 4,
    reviews: 98,
  },
];

const dessertProducts = [
  {
    id: 13,
    name: "تارت فواكه مثلجة",
    price: 35.00,
    image: dessert1,
    rating: 5,
    reviews: 76,
    isNew: true,
  },
  {
    id: 14,
    name: "كب كيك آيس كريم",
    price: 28.00,
    image: dessert1,
    rating: 4,
    reviews: 65,
  },
  {
    id: 15,
    name: "سندويش آيس كريم",
    price: 22.00,
    originalPrice: 30.00,
    image: dessert1,
    rating: 5,
    reviews: 112,
    badge: "-27%",
  },
  {
    id: 16,
    name: "بارفيه فواكه",
    price: 26.00,
    image: dessert1,
    rating: 5,
    reviews: 88,
    badge: "جديد",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroBanner />
      <FeaturesSection />
      
      <CategorySection
        title="آيس كريم"
        description="أشهى أنواع الآيس كريم بنكهات متنوعة وطازجة"
        products={iceCreamProducts}
        icon={<IceCream className="w-7 h-7 text-primary-foreground" />}
      />

      <CategorySection
        title="مثلجات"
        description="مثلجات منعشة ولذيذة لجميع الأذواق"
        products={frozenProducts}
        icon={<Snowflake className="w-7 h-7 text-primary-foreground" />}
      />

      <CategorySection
        title="عصائر وسموذي"
        description="مشروبات باردة ومنعشة محضرة بأجود المكونات"
        products={juiceProducts}
        icon={<GlassWater className="w-7 h-7 text-primary-foreground" />}
      />

      <CategorySection
        title="حلويات مثلجة"
        description="حلويات فاخرة ومثلجة لمناسباتكم الخاصة"
        products={dessertProducts}
        icon={<Cake className="w-7 h-7 text-primary-foreground" />}
      />

      <Footer />
    </div>
  );
};

export default Index;
