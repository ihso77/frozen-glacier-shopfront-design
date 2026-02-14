import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, Package, Users, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const AdminAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("admin-ai", {
        body: { message: userMsg, history: messages },
      });

      if (error) throw error;

      if (data?.action) {
        setMessages((prev) => [...prev, { role: "assistant", content: `${data.action_description}\n\n${data.reply}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى." }]);
    }
    setLoading(false);
  };

  const suggestionGroups = [
    {
      title: "إدارة الموقع",
      icon: Settings,
      items: [
        "فعّل وضع الصيانة",
        "غيّر ثيم الموقع إلى ذهبي",
        "غيّر اسم الموقع",
      ],
    },
    {
      title: "المنتجات",
      icon: Package,
      items: [
        "أضف منتج جديد اسمه PlayStation Plus بسعر 5 ر.ع",
        "اعرض لي كل المنتجات",
        "عطّل المنتج الأول",
      ],
    },
    {
      title: "الإحصائيات",
      icon: BarChart3,
      items: [
        "كم عدد المستخدمين؟",
        "أعطني ملخص المبيعات",
        "كم إجمالي الإيرادات؟",
      ],
    },
    {
      title: "المستخدمين",
      icon: Users,
      items: [
        "اعرض قائمة المستخدمين",
        "كم عميل VIP عندنا؟",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Bot className="w-6 h-6 text-primary" />
          المساعد الذكي للإدارة
        </h1>
        <p className="text-muted-foreground">مساعد ذكي بصلاحيات كاملة - يقدر يعدل المنتجات، المستخدمين، الإعدادات، والمزيد</p>
      </div>

      <div className="glass-card flex flex-col" style={{ height: "calc(100vh - 250px)" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="py-8 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <p className="text-foreground font-bold text-lg mb-2">مرحباً! أنا مساعدك الذكي 🤖</p>
                <p className="text-muted-foreground text-sm mb-6">لدي صلاحيات كاملة على الموقع. اطلب مني أي شي!</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {suggestionGroups.map((group, gi) => (
                  <div key={gi} className="bg-secondary/30 border border-border/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <group.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{group.title}</span>
                    </div>
                    <div className="space-y-1.5">
                      {group.items.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => sendMessage(s)}
                          className="w-full text-right px-3 py-2 rounded-lg bg-background/50 border border-border/30 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                msg.role === "user"
                  ? "bg-primary/15 border border-primary/20 text-foreground"
                  : "bg-secondary/70 text-foreground"
              }`}>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1 mb-1">
                    <Bot className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary font-medium">المساعد</span>
                  </div>
                )}
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary/70 p-3 rounded-xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border flex gap-2">
          <input
            type="text"
            className="auth-input h-10 text-sm flex-1"
            placeholder="اكتب أمراً... مثال: أضف منتج جديد، غير الثيم، اعرض الإحصائيات..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            maxLength={2000}
          />
          <Button size="icon" className="h-10 w-10 shrink-0" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminAI;
