import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Phone, Save, Package, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SnowBackground from "@/components/SnowBackground";

const ProfilePage = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState<string>("member");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    gender: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);

      const [profileRes, roleRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("orders").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(20),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setFormData({
          full_name: profileRes.data.full_name || "",
          phone: profileRes.data.phone || "",
          gender: profileRes.data.gender || "",
        });
      }
      setRole(roleRes.data?.role || "member");
      setOrders(ordersRes.data || []);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: formData.full_name,
      phone: formData.phone,
      gender: formData.gender || null,
    }).eq("user_id", user.id);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ ✅", description: "تم تحديث بياناتك بنجاح" });
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast({ title: "خطأ", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }
    if (passwordData.new.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: passwordData.new });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التحديث ✅", description: "تم تغيير كلمة المرور بنجاح" });
      setPasswordData({ current: "", new: "", confirm: "" });
    }
    setSaving(false);
  };

  const getRoleLabel = (r: string) => {
    const map: Record<string, string> = {
      owner: "المالك 👑", admin: "المدير 🛡️", member: "عضو",
      customer: "عميل 🛒", vip_customer: "عميل VIP ⭐",
    };
    return map[r] || r;
  };

  const getRoleBadgeClass = (r: string) => {
    const map: Record<string, string> = {
      owner: "bg-accent/20 text-accent",
      admin: "bg-primary/20 text-primary",
      customer: "bg-primary/20 text-primary",
      vip_customer: "bg-accent/20 text-accent",
    };
    return map[r] || "bg-secondary text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  const tabs = [
    { id: "profile", label: "الملف الشخصي", icon: User },
    { id: "orders", label: "مشترياتي", icon: Package },
    { id: "security", label: "الأمان", icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <SnowBackground />
      <div className="relative z-10">
        <Header />
        <div className="pt-24 pb-16 container mx-auto px-4 max-w-4xl">
          {/* Profile Header */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">
                {formData.full_name?.charAt(0) || "?"}
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-foreground">{formData.full_name || "مستخدم"}</h1>
                <p className="text-sm text-muted-foreground" dir="ltr">{user?.email}</p>
                <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(role)}`}>
                  {getRoleLabel(role)}
                </span>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{orders.length}</p>
                <p className="text-xs text-muted-foreground">طلب</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-secondary/50"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-lg font-bold text-foreground mb-4">معلوماتي الشخصية</h2>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <User className="w-4 h-4 text-primary" />
                  الاسم الكامل
                </label>
                <input className="auth-input" value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Mail className="w-4 h-4 text-primary" />
                  البريد الإلكتروني
                </label>
                <input className="auth-input opacity-60" value={user?.email || ""} disabled dir="ltr" />
                <p className="text-xs text-muted-foreground mt-1">لا يمكن تغيير البريد الإلكتروني</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Phone className="w-4 h-4 text-primary" />
                  رقم الجوال
                </label>
                <input className="auth-input" value={formData.phone} dir="ltr"
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">الجنس</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ v: "male", l: "👨 ذكر" }, { v: "female", l: "👩 أنثى" }].map((g) => (
                    <button key={g.v} type="button" onClick={() => setFormData({ ...formData, gender: g.v })}
                      className={`h-12 rounded-xl border transition-all ${
                        formData.gender === g.v
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="w-full gap-2">
                <Save className="w-4 h-4" />
                {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">مشترياتي</h2>
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-secondary/30 border border-border/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-foreground">{order.product_name}</h3>
                        <span className="text-primary font-bold">{order.price} ر.ع</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(order.created_at).toLocaleDateString("ar-SA")}</span>
                        <span className={`px-2 py-0.5 rounded-full ${
                          order.payment_status === "completed" ? "bg-green-500/20 text-green-500" : "bg-yellow-500/20 text-yellow-500"
                        }`}>
                          {order.payment_status === "completed" ? "مكتمل" : order.payment_status}
                        </span>
                      </div>
                      {order.redemption_code && order.payment_status === "completed" && (
                        <div className="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">كود الاستلام:</p>
                          <p className="font-mono text-sm text-primary font-bold" dir="ltr">{order.redemption_code}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>لا توجد مشتريات بعد</p>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="glass-card p-6 space-y-5">
              <h2 className="text-lg font-bold text-foreground mb-4">تغيير كلمة المرور</h2>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">كلمة المرور الجديدة</label>
                <input type="password" className="auth-input" value={passwordData.new} dir="ltr"
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">تأكيد كلمة المرور</label>
                <input type="password" className="auth-input" value={passwordData.confirm} dir="ltr"
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} />
              </div>
              <Button onClick={changePassword} disabled={saving} className="w-full gap-2">
                <Lock className="w-4 h-4" />
                {saving ? "جاري التحديث..." : "تغيير كلمة المرور"}
              </Button>

              <div className="border-t border-border pt-5 mt-5">
                <h3 className="text-foreground font-semibold mb-3">معلومات الحساب</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تاريخ التسجيل</span>
                    <span className="text-foreground">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ar-SA") : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الدور</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadgeClass(role)}`}>{getRoleLabel(role)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عدد المشتريات</span>
                    <span className="text-foreground">{orders.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default ProfilePage;
