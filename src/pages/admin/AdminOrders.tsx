import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Copy, Check, Search } from "lucide-react";


interface Order {
  id: string;
  product_name: string;
  price: number;
  payment_method: string;
  payment_status: string;
  redemption_code: string;
  is_redeemed: boolean;
  created_at: string;
  user_id: string;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const filteredOrders = orders.filter(
    (o) =>
      o.product_name.includes(search) ||
      o.redemption_code.includes(search) ||
      o.payment_method.includes(search)
  );

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const totalRevenue = orders.reduce((acc, o) => acc + (o.payment_status === "completed" ? o.price : 0), 0);

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-secondary rounded w-48" /><div className="h-64 bg-secondary rounded-2xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-primary" />
            الطلبات
          </h1>
          <p className="text-muted-foreground">إجمالي الإيرادات: <span className="text-primary font-bold">{totalRevenue.toFixed(3)} ر.ع</span></p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          className="auth-input pr-10"
          placeholder="بحث بالمنتج أو الكود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">المنتج</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">السعر</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">الطريقة</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">الكود</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">الحالة</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-secondary/30">
                  <td className="p-4 font-medium text-foreground">{order.product_name}</td>
                  <td className="p-4 text-primary font-medium">{order.price} ر.ع</td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {order.payment_method === "paypal" ? "PayPal" : "بطاقة"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono text-muted-foreground" dir="ltr">{order.redemption_code}</code>
                      <button onClick={() => copyCode(order.redemption_code)} className="text-muted-foreground hover:text-primary">
                        {copiedCode === order.redemption_code ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.is_redeemed ? "bg-green-500/20 text-green-500" : "bg-accent/20 text-accent"
                    }`}>
                      {order.is_redeemed ? "مُستَلم" : "جديد"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("ar-SA")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">لا توجد طلبات</div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
