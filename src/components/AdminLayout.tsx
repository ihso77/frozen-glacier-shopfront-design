import { useState, useEffect } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ChevronLeft,
  Mail,
  Ticket,
  Key,
  ShoppingCart,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminLayout = () => {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            checkUserRole(session.user.id);
            fetchUnreadMessages();
          }, 0);
        } else {
          setLoading(false);
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserRole(session.user.id);
        fetchUnreadMessages();
      } else {
        setLoading(false);
        navigate("/auth");
      }
    });

    // الاستماع للرسائل الجديدة
    const channel = supabase
      .channel('admin-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchUnreadMessages()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const checkUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching role:", error);
      toast({
        title: "خطأ",
        description: "لا تملك صلاحية الوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    if (!data || (data.role !== "admin" && data.role !== "owner")) {
      toast({
        title: "غير مصرح",
        description: "لا تملك صلاحية الوصول لهذه الصفحة",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setUserRole(data.role);
    setLoading(false);
  };

  const fetchUnreadMessages = async () => {
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);

    setUnreadMessages(count || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    { name: "الإحصائيات", href: "/admin", icon: LayoutDashboard },
    { name: "المنتجات", href: "/admin/products", icon: Package },
    { name: "الطلبات", href: "/admin/orders", icon: ShoppingCart },
    { name: "المستخدمين", href: "/admin/users", icon: Users },
    { name: "الرسائل", href: "/admin/messages", icon: Mail, badge: unreadMessages },
    { name: "تذاكر الدعم", href: "/admin/tickets", icon: Ticket },
    { name: "الأكواد", href: "/admin/codes", icon: Key },
    { name: "المساعد الذكي", href: "/admin/ai", icon: Bot },
    { name: "الإعدادات", href: "/admin/settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">❄️</span>
          </div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-50 w-64 bg-card/95 backdrop-blur-xl border-l border-border/50 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border/50 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10 group-hover:shadow-primary/30 transition-all duration-300">
                <span className="text-lg">❄️</span>
              </div>
              <span className="text-xl font-bold frozen-logo">فروزن</span>
            </Link>
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/30 shadow-lg shadow-primary/10"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-3 px-4 py-3 mb-2 glass-card">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30">
                <span className="text-primary font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userRole === "owner" ? "مالك" : "مدير"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/30 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              className="lg:hidden text-foreground hover:bg-secondary/50 p-2 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link 
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              <span>العودة للمتجر</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          <Outlet context={{ userRole }} />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;