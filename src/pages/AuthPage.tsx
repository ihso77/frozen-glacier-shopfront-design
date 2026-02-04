import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Snowflake, Mail, Lock, User, Phone, Sparkles, Zap, Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
  phone: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string(),
  agreeTerms: z.boolean().refine(val => val === true, "يجب الموافقة على الشروط"),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Register form state
  const [registerData, setRegisterData] = useState({
    fullName: "",
    phone: "",
    gender: "" as "male" | "female" | "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      loginSchema.parse(loginData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    setLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: loginData.email,
      password: loginData.password,
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login")) {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
          variant: "destructive",
        });
      } else if (error.message.includes("Email not confirmed")) {
        toast({
          title: "البريد غير مفعل",
          description: "يرجى تفعيل بريدك الإلكتروني أولاً",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "مرحباً بك!",
      description: "تم تسجيل الدخول بنجاح",
    });
    navigate("/");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      registerSchema.parse(registerData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: registerData.fullName,
          phone: registerData.phone,
          gender: registerData.gender || null,
        },
      },
    });

    if (error) {
      setLoading(false);
      if (error.message.includes("already registered")) {
        toast({
          title: "خطأ",
          description: "هذا البريد الإلكتروني مسجل مسبقاً",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    // Create profile
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        full_name: registerData.fullName,
        phone: registerData.phone || null,
        gender: registerData.gender || null,
        email: registerData.email,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      // Create default member role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "member",
      });

      if (roleError) {
        console.error("Role creation error:", roleError);
      }
    }

    setLoading(false);

    toast({
      title: "تم إنشاء الحساب!",
      description: "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب",
    });
    
    setIsLogin(true);
  };

  const features = [
    { icon: Sparkles, title: "منتجات حصرية", desc: "احصل على أفضل العروض والحسابات المميزة" },
    { icon: Zap, title: "تسليم فوري", desc: "استلم طلباتك في أقل من دقيقة" },
    { icon: Shield, title: "أمان تام", desc: "جميع معاملاتك محمية بأعلى معايير الأمان" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/20 to-background" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-md space-y-8">
          {features.map((feature, i) => (
            <div key={i} className="glass-card p-6 flex flex-col items-center text-center">
              <feature.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-bold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 lg:p-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-aurora/20 border border-primary/30 flex items-center justify-center">
                  <Snowflake className="w-5 h-5 text-primary" />
                </div>
                <span className="text-2xl font-black frozen-logo">فروزن</span>
              </Link>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isLogin ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isLogin ? "سجل دخولك للوصول إلى حسابك" : "انضم إلى متجر فروزن الآن"}
              </p>
            </div>

            {isLogin ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4" />
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="example@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    dir="ltr"
                  />
                  {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    dir="ltr"
                  />
                  {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-border bg-secondary"
                      checked={loginData.rememberMe}
                      onChange={(e) => setLoginData({ ...loginData, rememberMe: e.target.checked })}
                    />
                    تذكرني
                  </label>
                  <button type="button" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-button-primary flex items-center justify-center gap-2"
                >
                  {loading ? "جاري التحميل..." : (
                    <>
                      <Zap className="w-4 h-4" />
                      الدخول السريع
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-button-secondary flex items-center justify-center gap-2"
                >
                  تسجيل الدخول
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <User className="w-4 h-4" />
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="أدخل اسمك الكامل"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                  />
                  {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Phone className="w-4 h-4" />
                    رقم الجوال
                  </label>
                  <input
                    type="tel"
                    className="auth-input"
                    placeholder="512345678"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <User className="w-4 h-4" />
                    الجنس
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, gender: "male" })}
                      className={`h-12 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                        registerData.gender === "male"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      👨 ذكر
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, gender: "female" })}
                      className={`h-12 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                        registerData.gender === "female"
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-secondary/50 text-muted-foreground"
                      }`}
                    >
                      👩 أنثى
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4" />
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="example@email.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    dir="ltr"
                  />
                  {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    dir="ltr"
                  />
                  {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Lock className="w-4 h-4" />
                    تأكيد كلمة المرور
                  </label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    dir="ltr"
                  />
                  {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="w-4 h-4 rounded border-border bg-secondary"
                    checked={registerData.agreeTerms}
                    onChange={(e) => setRegisterData({ ...registerData, agreeTerms: e.target.checked })}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    أوافق على{" "}
                    <span className="text-primary cursor-pointer">سياسة الخدمة</span>
                    {" "}و{" "}
                    <span className="text-primary cursor-pointer">سياسة الإرجاع</span>
                  </label>
                </div>
                {errors.agreeTerms && <p className="text-destructive text-xs">{errors.agreeTerms}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-button-secondary flex items-center justify-center gap-2"
                >
                  {loading ? "جاري التحميل..." : (
                    <>
                      إنشاء الحساب
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Toggle */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-primary font-medium hover:underline mr-1"
              >
                {isLogin ? "إنشاء حساب" : "تسجيل الدخول"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
