import { useState } from "react";
import { X, CreditCard, Copy, Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CheckoutModalProps {
  onClose: () => void;
}

const CheckoutModal = ({ onClose }: CheckoutModalProps) => {
  const { items, totalPrice, clearCart } = useCart();
  const [step, setStep] = useState<"payment" | "processing" | "complete">("payment");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
  const [orderCodes, setOrderCodes] = useState<{ name: string; code: string }[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });

  const handleCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }

    setStep("processing");

    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));

    // Create orders
    const codes: { name: string; code: string }[] = [];

    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        const { data, error } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            product_id: item.id,
            product_name: item.name,
            price: item.price,
            payment_method: paymentMethod,
            payment_status: "completed",
          })
          .select("redemption_code")
          .single();

        if (!error && data) {
          codes.push({ name: item.name, code: data.redemption_code });
        }
      }
    }

    setOrderCodes(codes);
    clearCart();
    setStep("complete");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            {step === "complete" ? "تم الشراء بنجاح!" : "إتمام الشراء"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === "payment" && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-sm">ملخص الطلب</h3>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-foreground font-medium">
                      {(item.price * item.quantity).toFixed(3)} ر.ع
                    </span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-bold text-foreground">الإجمالي</span>
                  <span className="font-bold text-primary text-lg">{totalPrice.toFixed(3)} ر.ع</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground text-sm">طريقة الدفع</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CreditCard className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium text-foreground">بطاقة بنكية</span>
                    <span className="text-xs text-muted-foreground">Sandbox</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("paypal")}
                    className={`p-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                      paymentMethod === "paypal"
                        ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-2xl">🅿️</span>
                    <span className="text-sm font-medium text-foreground">PayPal</span>
                    <span className="text-xs text-muted-foreground">Sandbox</span>
                  </button>
                </div>
              </div>

              {/* Card Form (Sandbox) */}
              {paymentMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">اسم حامل البطاقة</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="الاسم الكامل"
                      value={cardData.name}
                      onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">رقم البطاقة</label>
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="4242 4242 4242 4242"
                      value={cardData.number}
                      onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                      dir="ltr"
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">تاريخ الانتهاء</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="MM/YY"
                        value={cardData.expiry}
                        onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                        dir="ltr"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">CVV</label>
                      <input
                        type="text"
                        className="auth-input"
                        placeholder="123"
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                        dir="ltr"
                        maxLength={4}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    ⚠️ وضع تجريبي - لن يتم خصم أي مبلغ حقيقي
                  </p>
                </div>
              )}

              {paymentMethod === "paypal" && (
                <div className="p-6 text-center glass-card">
                  <span className="text-4xl mb-3 block">🅿️</span>
                  <p className="text-muted-foreground text-sm">
                    سيتم توجيهك إلى PayPal لإتمام الدفع
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ وضع تجريبي (Sandbox)
                  </p>
                </div>
              )}

              <Button
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
                onClick={handleCheckout}
              >
                تأكيد الدفع - {totalPrice.toFixed(3)} ر.ع
              </Button>
            </div>
          )}

          {step === "processing" && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <p className="text-foreground font-medium mb-2">جاري معالجة الدفع...</p>
              <p className="text-muted-foreground text-sm">يرجى الانتظار</p>
            </div>
          )}

          {step === "complete" && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-foreground font-bold text-lg mb-1">تمت العملية بنجاح!</p>
                <p className="text-muted-foreground text-sm">
                  احفظ الأكواد التالية لاستخدامها
                </p>
              </div>

              <div className="space-y-3">
                {orderCodes.map((order, i) => (
                  <div key={i} className="glass-card p-4">
                    <p className="text-sm text-muted-foreground mb-2">{order.name}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-secondary/50 px-4 py-2 rounded-lg text-primary font-mono text-sm" dir="ltr">
                        {order.code}
                      </code>
                      <button
                        onClick={() => copyCode(order.code)}
                        className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-primary"
                      >
                        {copiedCode === order.code ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="w-full rounded-xl"
                variant="outline"
                onClick={onClose}
              >
                إغلاق
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
