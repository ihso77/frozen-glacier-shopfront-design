import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, User, Crown, Star, ShoppingCart, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  created_at: string;
  role?: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { userRole } = useOutletContext<{ userRole: string }>();

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");

    const usersWithRoles = profiles?.map((profile) => ({
      ...profile,
      role: roles?.find((r) => r.user_id === profile.user_id)?.role || "member",
    }));
    setUsers(usersWithRoles || []);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (userRole !== "owner") {
      toast({ title: "غير مصرح", description: "فقط المالك يمكنه تغيير الأدوار", variant: "destructive" });
      return;
    }
    const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", userId).maybeSingle();
    if (existingRole) {
      const { error } = await supabase.from("user_roles").update({ role: newRole } as any).eq("user_id", userId);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole } as any);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: "تم التحديث ✅", description: "تم تحديث الدور بنجاح" });
    fetchUsers();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="w-4 h-4 text-yellow-500" />;
      case "admin": return <Shield className="w-4 h-4 text-primary" />;
      case "customer": return <ShoppingCart className="w-4 h-4 text-green-500" />;
      case "vip_customer": return <Star className="w-4 h-4 text-amber-500" />;
      default: return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
      owner: "المالك", admin: "المدير", member: "عضو",
      customer: "عميل", vip_customer: "عميل VIP",
    };
    return map[role] || role;
  };

  const getRoleBadgeClass = (role: string) => {
    const map: Record<string, string> = {
      owner: "bg-yellow-500/20 text-yellow-500",
      admin: "bg-primary/20 text-primary",
      customer: "bg-green-500/20 text-green-500",
      vip_customer: "bg-amber-500/20 text-amber-500",
    };
    return map[role] || "bg-secondary text-muted-foreground";
  };

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-secondary rounded w-48" /><div className="h-64 bg-secondary rounded-2xl" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">إجمالي {users.length} مستخدم</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="auth-input pr-10 w-64" placeholder="بحث بالاسم أو البريد..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "الكل", count: users.length, color: "text-foreground" },
          { label: "المالك", count: users.filter(u => u.role === "owner").length, color: "text-yellow-500" },
          { label: "المديرين", count: users.filter(u => u.role === "admin").length, color: "text-primary" },
          { label: "العملاء", count: users.filter(u => u.role === "customer").length, color: "text-green-500" },
          { label: "VIP", count: users.filter(u => u.role === "vip_customer").length, color: "text-amber-500" },
        ].map((s, i) => (
          <div key={i} className="glass-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">المستخدم</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">البريد</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">الجوال</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">الدور</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">التسجيل</th>
                {userRole === "owner" && <th className="text-right p-4 text-sm font-medium text-muted-foreground">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold">{user.full_name?.charAt(0) || "?"}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.gender === "male" ? "ذكر" : user.gender === "female" ? "أنثى" : "-"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground" dir="ltr">{user.email}</td>
                  <td className="p-4 text-muted-foreground" dir="ltr">{user.phone || "-"}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role || "member")}`}>
                      {getRoleIcon(user.role || "member")}
                      {getRoleLabel(user.role || "member")}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">{new Date(user.created_at).toLocaleDateString("ar-SA")}</td>
                  {userRole === "owner" && (
                    <td className="p-4">
                      <select className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
                        value={user.role || "member"}
                        onChange={(e) => updateUserRole(user.user_id, e.target.value)}>
                        <option value="member">عضو</option>
                        <option value="customer">عميل</option>
                        <option value="vip_customer">عميل VIP</option>
                        <option value="admin">المدير</option>
                        <option value="owner">المالك</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">لا يوجد مستخدمين مطابقين</div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
