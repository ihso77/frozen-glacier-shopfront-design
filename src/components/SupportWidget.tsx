import { useState, useEffect } from "react";
import { MessageCircle, X, Send, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SupportWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }

    if (!user) {
      toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }

    setSending(true);

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        user_email: user.email,
        subject: subject.trim(),
      })
      .select("id")
      .single();

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }

    // Add first message
    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      content: content.trim(),
    });

    toast({ title: "تم فتح التذكرة بنجاح!", description: "سيتم الرد عليك قريباً" });
    setSubject("");
    setContent("");
    setIsOpen(false);
    setSending(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-110 transition-all duration-300 flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
      </button>

      {/* Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-40 w-80 glass-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">تذكرة دعم فني</h3>
          </div>

          {!user ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm mb-3">يرجى تسجيل الدخول لفتح تذكرة دعم</p>
              <a href="/auth">
                <Button className="rounded-xl" size="sm">تسجيل الدخول</Button>
              </a>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">الموضوع</label>
                <input
                  type="text"
                  className="auth-input h-10 text-sm"
                  placeholder="عنوان المشكلة"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">الرسالة</label>
                <textarea
                  className="auth-input text-sm min-h-[80px]"
                  placeholder="اشرح مشكلتك بالتفصيل..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={1000}
                />
              </div>
              <Button
                className="w-full rounded-xl gap-2"
                onClick={handleSubmit}
                disabled={sending || !subject.trim() || !content.trim()}
                size="sm"
              >
                <Send className="w-4 h-4" />
                {sending ? "جاري الإرسال..." : "فتح التذكرة"}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default SupportWidget;
