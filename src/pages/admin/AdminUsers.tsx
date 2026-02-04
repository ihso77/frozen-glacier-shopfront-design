import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, User, Crown } from "lucide-react";
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
  const { toast } = useToast();
  const { userRole } = useOutletContext<{ userRole: string }>();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setLoading(false);
      return;
    }

    // Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    // Merge profiles with roles
    const usersWithRoles = profiles?.map((profile) => ({
      ...profile,
      role: roles?.find((r) => r.user_id === profile.user_id)?.role || "member",
    }));

    setUsers(usersWithRoles || []);
    setLoading(false);
  };

  const updateUserRole = async (userId: string, newRole: "owner" | "admin" | "member") => {
    if (userRole !== "owner") {
      toast({
        title: "غير مصرح",
        description: "فقط المالك يمكنه تغيير الأدوار",
        variant: "destructive",
      });
      return;
    }

    // Check if role exists
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRole) {
      // Update existing role
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        return;
      }
    } else {
      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });

      if (error) {
        toast({ title: "خطأ", description: error.message, variant: "destructive" });
        return;
      }
    }

    toast({ title: "تم التحديث", description: "تم تحديث الدور بنجاح" });
    fetchUsers();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "admin":
        return <Shield className="w-4 h-4 text-primary" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "مالك";
      case "admin":
        return "مدير";
      default:
        return "عضو";
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-yellow-500/20 text-yellow-500";
      case "admin":
        return "bg-primary/20 text-primary";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary rounded w-48" />
        <div className="h-64 bg-secondary rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2">إدارة المستخدمين</h1>
        <p className="text-muted-foreground">عرض وإدارة صلاحيات المستخدمين</p>
      </div>

      {/* Users Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">المستخدم</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">البريد</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">الجوال</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">الدور</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">تاريخ التسجيل</th>
                {userRole === "owner" && (
                  <th className="text-right p-4 text-sm font-medium text-muted-foreground">إجراءات</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-secondary/30">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {user.full_name?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.gender === "male" ? "ذكر" : user.gender === "female" ? "أنثى" : "-"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground" dir="ltr">
                    {user.email}
                  </td>
                  <td className="p-4 text-muted-foreground" dir="ltr">
                    {user.phone || "-"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeClass(
                        user.role || "member"
                      )}`}
                    >
                      {getRoleIcon(user.role || "member")}
                      {getRoleLabel(user.role || "member")}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("ar-SA")}
                  </td>
                  {userRole === "owner" && (
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <select
                          className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground"
                          value={user.role || "member"}
                          onChange={(e) =>
                            updateUserRole(user.user_id, e.target.value as "owner" | "admin" | "member")
                          }
                        >
                          <option value="member">عضو</option>
                          <option value="admin">مدير</option>
                          <option value="owner">مالك</option>
                        </select>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            لا يوجد مستخدمين حالياً
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
