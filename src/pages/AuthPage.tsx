import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, Phone, Shield, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import SnowBackground from "@/components/SnowBackground";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const loginSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

const registerSchema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(100),
  phone: z.string().min(7, "رقم الجوال غير صحيح"),
  countryCode: z.string().min(1, "كود الدولة مطلوب"),
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
  const [step, setStep] = useState<"details" | "otp">("details");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userOtp, setUserOtp] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
  }, [navigate]);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [registerData, setRegisterData] = useState({
    fullName: "",
    phone: "",
    countryCode: "+966",
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
      toast({
        title: "خطأ في تسجيل الدخول",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "مرحباً بك!", description: "تم تسجيل الدخول بنجاح" });
    navigate("/");
  };

  const sendOtp = async () => {
    setLoading(true);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    
    // تنظيف الرقم: إزالة الأصفار في البداية والمسافات
    const cleanPhoneInput = registerData.phone.trim().replace(/^0+/, '').replace(/\s+/g, '');
    const fullPhone = `${registerData.countryCode}${cleanPhoneInput}`;
    
    console.log("Sending OTP to:", fullPhone);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: fullPhone, otp: otp }
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      setStep("otp");
      toast({
        title: "تم إرسال الرمز",
        description: "يرجى إدخال رمز التحقق المرسل إلى جوالك",
      });
    } catch (error: any) {
      console.error("OTP Error:", error);
      toast({
        title: "خطأ في إرسال الرمز",
        description: error.message || "تعذر إرسال رمز التحقق، يرجى المحاولة لاحقاً",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      registerSchema.parse(registerData);
      await sendOtp();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
      }
    }
  };

  const verifyOtpAndRegister = async () => {
    if (userOtp !== generatedOtp) {
      toast({
        title: "رمز غير صحيح",
        description: "رمز التحقق الذي أدخلته غير صحيح",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const cleanPhoneInput = registerData.phone.trim().replace(/^0+/, '').replace(/\s+/g, '');
    const fullPhone = `${registerData.countryCode}${cleanPhoneInput}`;

    const { error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        data: {
          full_name: registerData.fullName,
          phone: fullPhone,
          gender: registerData.gender || null,
        },
      },
    });

    setLoading(false);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "تم إنشاء الحساب!",
      description: "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.",
    });
    setIsLogin(true);
    setStep("details");
  };

  const countryCodes = [
    { code: "+966", name: "السعودية", flag: "🇸🇦" },
    { code: "+971", name: "الإمارات", flag: "🇦🇪" },
    { code: "+965", name: "الكويت", flag: "🇰🇼" },
    { code: "+974", name: "قطر", flag: "🇶🇦" },
    { code: "+973", name: "البحرين", flag: "🇧🇭" },
    { code: "+968", name: "عمان", flag: "🇴🇲" },
    { code: "+962", name: "الأردن", flag: "🇯🇴" },
    { code: "+964", name: "العراق", flag: "🇮🇶" },
    { code: "+20", name: "مصر", flag: "🇪🇬" },
  ];

  return (
    <div className="min-h-screen bg-background flex relative">
      <SnowBackground />
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10">
        <div className="relative z-10 max-w-md space-y-8 text-center">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <span className="text-5xl">✦</span>
          </div>
          <h2 className="text-4xl font-bold frozen-logo mb-4">Nova Store</h2>
          <p className="text-muted-foreground">متجرك الموثوق للخدمات الرقمية</p>
          <div className="glass-card p-6 flex flex-col items-center text-center">
            <Shield className="w-10 h-10 text-primary mb-4" />
            <h3 className="font-bold text-lg text-foreground mb-2">حماية متقدمة</h3>
            <p className="text-muted-foreground text-sm">تشفير عالي المستوى لحماية بياناتك</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="glass-card p-8 lg:p-10">
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300">
                  <span className="text-2xl">✦</span>
                </div>
                <span className="text-2xl font-black frozen-logo">Nova Store</span>
              </Link>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {isLogin ? "مرحباً بعودتك" : step === "otp" ? "التحقق من الجوال" : "إنشاء حساب جديد"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {isLogin ? "سجل دخولك للوصول إلى حسابك" : step === "otp" ? "أدخل الرمز المرسل إلى جوالك" : "انضم إلى Nova Store الآن"}
              </p>
            </div>

            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4 text-primary" /> البريد الإلكتروني
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
                    <Lock className="w-4 h-4 text-primary" /> كلمة المرور
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
                <button type="submit" disabled={loading} className="auth-button-primary flex items-center justify-center gap-2">
                  {loading ? "جاري التحميل..." : "تسجيل الدخول"} <ArrowLeft className="w-4 h-4" />
                </button>
              </form>
            ) : step === "otp" ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <InputOTP maxLength={6} value={userOtp} onChange={(value) => setUserOtp(value)}>
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="rounded-lg border-2" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-sm text-muted-foreground">
                    لم يصلك الرمز؟ <button onClick={sendOtp} className="text-primary hover:underline font-medium">إعادة الإرسال</button>
                  </p>
                </div>
                <button onClick={verifyOtpAndRegister} disabled={loading || userOtp.length !== 6} className="auth-button-primary flex items-center justify-center gap-2">
                  {loading ? "جاري التحقق..." : "تحقق وإنشاء الحساب"} <CheckCircle2 className="w-4 h-4" />
                </button>
                <button onClick={() => setStep("details")} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">تعديل رقم الجوال</button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <User className="w-4 h-4 text-primary" /> الاسم الكامل
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
                    <Phone className="w-4 h-4 text-primary" /> رقم الجوال
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="auth-input w-32 px-2"
                      value={registerData.countryCode}
                      onChange={(e) => setRegisterData({ ...registerData, countryCode: e.target.value })}
                    >
                      {countryCodes.map((c) => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      className="auth-input flex-1"
                      placeholder="512345678"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  {errors.phone && <p className="text-destructive text-xs mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Mail className="w-4 h-4 text-primary" /> البريد الإلكتروني
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
                    <Lock className="w-4 h-4 text-primary" /> كلمة المرور
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
                    <Lock className="w-4 h-4 text-primary" /> تأكيد كلمة المرور
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
                    أوافق على <span className="text-primary cursor-pointer hover:underline">سياسة الخدمة</span> و <span className="text-primary cursor-pointer hover:underline">سياسة الإرجاع</span>
                  </label>
                </div>
                {errors.agreeTerms && <p className="text-destructive text-xs">{errors.agreeTerms}</p>}
                <button type="submit" disabled={loading} className="auth-button-primary flex items-center justify-center gap-2">
                  {loading ? "جاري التحميل..." : "إنشاء الحساب"} <ArrowLeft className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="mt-8 text-center border-t border-border pt-6">
              <p className="text-muted-foreground text-sm mb-3">{isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}</p>
              <button onClick={() => { setIsLogin(!isLogin); setErrors({}); setStep("details"); }} className="auth-button-secondary">
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
