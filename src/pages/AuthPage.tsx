import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, Phone, Shield, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import SnowBackground from "@/components/SnowBackground";

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

  // التحقق إذا كان المستخدم مسجل
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

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

    // Profile and role are now created automatically via database trigger

    setLoading(false);

    toast({
      title: "تم إنشاء الحساب!",
      description: "تم إرسال رسالة تحقق إلى بريدك الإلكتروني. يرجى التحقق لتفعيل حسابك.",
    });
    
    setIsLogin(true);
  };

  const features = [
    { icon: Shield, title: "حماية متقدمة", desc: "تشفير عالي المستوى لحماية بياناتك" },
  ];

  return (
    <div className="min-h-screen bg-background flex relative">
      <SnowBackground />
      
      {/* Left Side - Features */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10">
        <div className="relative z-10 max-w-md space-y-8">
          {/* شعار كبير */}
          <div className="text-center mb-12">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
              <span className="text-5xl">❄️</span>
            </div>
            <h2 className="text-4xl font-bold frozen-logo mb-4">فروزن</h2>
            <p className="text-muted-foreground">متجرك الموثوق للخدمات الرقمية</p>
          </div>

          {features.map((feature, i) => (
            <div key={i} className="glass-card p-6 flex flex-col items-center text-center">
              <feature.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="font-bold text-lg text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 lg:p-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                  <span className="text-2xl">❄️</span>
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
                    <Mail className="w-4 h-4 text-primary" />
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
                    <Lock className="w-4 h-4 text-primary" />
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
                      className="w-4 h-4 rounded border-border bg-secondary accent-primary"
                      checked={loginData.rememberMe}
                      onChange={(e) => setLoginData({ ...loginData, rememberMe: e.target.checked })}
                    />
                    تذكرني
                  </label>
                  <button type="button" className="text-sm text-primary hover:text-primary/80 transition-colors">
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-button-primary flex items-center justify-center gap-2"
                >
                  {loading ? "جاري التحميل..." : "تسجيل الدخول"}
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <User className="w-4 h-4 text-primary" />
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
                    <Phone className="w-4 h-4 text-primary" />
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
                    <User className="w-4 h-4 text-primary" />
                    الجنس
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, gender: "male" })}
                      className={`h-12 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                        registerData.gender === "male"
                          ? "border-primary bg-primary/10 text-foreground shadow-lg shadow-primary/10"
                          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      👨 ذكر
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegisterData({ ...registerData, gender: "female" })}
                      className={`h-12 rounded-xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                        registerData.gender === "female"
                          ? "border-primary bg-primary/10 text-foreground shadow-lg shadow-primary/10"
                          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      👩 أنثى
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4 text-primary" />
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
                    <Lock className="w-4 h-4 text-primary" />
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
                    <Lock className="w-4 h-4 text-primary" />
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
                    className="w-4 h-4 rounded border-border bg-secondary accent-primary"
                    checked={registerData.agreeTerms}
                    onChange={(e) => setRegisterData({ ...registerData, agreeTerms: e.target.checked })}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    أوافق على{" "}
                    <span className="text-primary cursor-pointer hover:underline">سياسة الخدمة</span>
                    {" "}و{" "}
                    <span className="text-primary cursor-pointer hover:underline">سياسة الإرجاع</span>
                  </label>
                </div>
                {errors.agreeTerms && <p className="text-destructive text-xs">{errors.agreeTerms}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-button-primary flex items-center justify-center gap-2"
                >
                  {loading ? "جاري التحميل..." : "إنشاء الحساب"}
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Toggle Auth Mode */}
            <div className="mt-8 text-center border-t border-border pt-6">
              <p className="text-muted-foreground text-sm mb-3">
                {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
              </p>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="auth-button-secondary"
              >
                {isLogin ? "إنشاء حساب جديد" : "تسجيل الدخول"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;