import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Key, Package, User, CreditCard, Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface OrderDetails {
  id: string;
  product_name: string;
  price: number;
  payment_method: string;
  payment_status: string;
  redemption_code: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
  user_id: string;
}

const AdminCodes = () => {
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  const searchCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setNotFound(false);
    setOrder(null);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("redemption_code", code.trim())
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  const markRedeemed = async () => {
    if (!order) return;

    const { error } = await supabase
      .from("orders")
      .update({ is_redeemed: true, redeemed_at: new Date().toISOString() })
      .eq("id", order.id);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التحديث", description: "تم تسجيل استخدام الكود" });
      setOrder({ ...order, is_redeemed: true, redeemed_at: new Date().toISOString() });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Key className="w-6 h-6 text-primary" />
          التحقق من الأكواد
        </h1>
        <p className="text-muted-foreground">ابحث عن كود الشراء لعرض تفاصيله</p>
      </div>

      {/* Search */}
      <div className="glass-card p-6">
        <div className="flex gap-3">
          <input
            type="text"
            className="auth-input flex-1"
            placeholder="أدخل كود الشراء..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchCode()}
            dir="ltr"
          />
          <Button onClick={searchCode} disabled={loading} className="gap-2 px-6">
            <Search className="w-4 h-4" />
            {loading ? "جاري البحث..." : "بحث"}
          </Button>
        </div>
      </div>

      {/* Not Found */}
      {notFound && (
        <div className="glass-card p-8 text-center">
          <X className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground font-medium">لم يتم العثور على هذا الكود</p>
          <p className="text-muted-foreground text-sm mt-1">تأكد من صحة الكود وحاول مرة أخرى</p>
        </div>
      )}

      {/* Order Details */}
      {order && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">تفاصيل الطلب</h2>
            <span
              className={`px-3 py-1 text-sm rounded-full ${
                order.is_redeemed
                  ? "bg-muted text-muted-foreground"
                  : "bg-green-500/20 text-green-500"
              }`}
            >
              {order.is_redeemed ? "مُستخدم" : "صالح"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">المنتج</p>
                <p className="font-medium text-foreground">{order.product_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">المبلغ</p>
                <p className="font-medium text-foreground">{order.price} ر.ع</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">طريقة الدفع</p>
                <p className="font-medium text-foreground">
                  {order.payment_method === "card" ? "بطاقة بنكية" : "PayPal"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">تاريخ الشراء</p>
                <p className="font-medium text-foreground">
                  {new Date(order.created_at).toLocaleString("ar-SA")}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-secondary/30 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">كود الاسترداد</p>
            <code className="text-primary font-mono text-lg" dir="ltr">{order.redemption_code}</code>
          </div>

          {order.is_redeemed && order.redeemed_at && (
            <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              تم الاستخدام بتاريخ: {new Date(order.redeemed_at).toLocaleString("ar-SA")}
            </div>
          )}

          {!order.is_redeemed && (
            <Button
              onClick={markRedeemed}
              className="w-full gap-2 rounded-xl"
              variant="outline"
            >
              <Check className="w-4 h-4" />
              تسجيل كمُستخدم (استخدام مرة واحدة)
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCodes;
