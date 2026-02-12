import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Ticket, ArrowRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TicketData {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

interface TicketMsg {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

type View = "menu" | "new-ticket" | "my-tickets" | "chat" | "ai-chat";

const SupportWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [messages, setMessages] = useState<TicketMsg[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (user && view === "my-tickets") fetchTickets();
  }, [user, view]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiMessages]);

  useEffect(() => {
    if (!selectedTicket) return;
    const channel = supabase
      .channel(`ticket-${selectedTicket.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${selectedTicket.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as TicketMsg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket]);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const openTicketChat = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
    setView("chat");
  };

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !content.trim() || !user) return;
    setSending(true);

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({ user_id: user.id, user_email: user.email, subject: subject.trim() })
      .select("id")
      .single();

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }

    await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      content: content.trim(),
    });

    toast({ title: "تم فتح التذكرة بنجاح!" });
    setSubject("");
    setContent("");
    setSending(false);
    setView("my-tickets");
  };

  const sendTicketMessage = async () => {
    if (!newMsg.trim() || !selectedTicket || !user) return;
    setSending(true);
    await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      content: newMsg.trim(),
    });
    setNewMsg("");
    setSending(false);
  };

  const sendAiMessage = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setAiLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { message: userMsg, history: aiMessages },
      });

      if (error) throw error;
      setAiMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى." }]);
    }
    setAiLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-110 transition-all duration-300 flex items-center justify-center"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 left-6 z-40 w-80 sm:w-96 glass-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center gap-2 shrink-0">
            {view !== "menu" && (
              <button onClick={() => setView("menu")} className="text-muted-foreground hover:text-foreground mr-1">
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <MessageCircle className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-sm">
              {view === "menu" && "المساعدة والدعم"}
              {view === "new-ticket" && "تذكرة جديدة"}
              {view === "my-tickets" && "تذاكري"}
              {view === "chat" && selectedTicket?.subject}
              {view === "ai-chat" && "المساعد الذكي"}
            </h3>
          </div>

          {!user ? (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm mb-3">يرجى تسجيل الدخول</p>
              <a href="/auth">
                <Button className="rounded-xl" size="sm">تسجيل الدخول</Button>
              </a>
            </div>
          ) : (
            <>
              {/* Menu */}
              {view === "menu" && (
                <div className="p-4 space-y-2">
                  <button
                    onClick={() => { setAiMessages([]); setView("ai-chat"); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all text-right"
                  >
                    <Bot className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-sm">المساعد الذكي</p>
                      <p className="text-xs text-muted-foreground">اسأل أي سؤال واحصل على إجابة فورية</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setView("new-ticket")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-all text-right"
                  >
                    <Ticket className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-sm">فتح تذكرة دعم</p>
                      <p className="text-xs text-muted-foreground">تواصل مع فريق الدعم</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setView("my-tickets")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/50 border border-border hover:border-primary/30 transition-all text-right"
                  >
                    <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground text-sm">تذاكري</p>
                      <p className="text-xs text-muted-foreground">عرض التذاكر السابقة والردود</p>
                    </div>
                  </button>
                </div>
              )}

              {/* New Ticket */}
              {view === "new-ticket" && (
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    className="auth-input h-10 text-sm"
                    placeholder="عنوان المشكلة"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={100}
                  />
                  <textarea
                    className="auth-input text-sm min-h-[80px] pt-3"
                    placeholder="اشرح مشكلتك بالتفصيل..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={1000}
                  />
                  <Button
                    className="w-full rounded-xl gap-2"
                    onClick={handleSubmitTicket}
                    disabled={sending || !subject.trim() || !content.trim()}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                    {sending ? "جاري الإرسال..." : "فتح التذكرة"}
                  </Button>
                </div>
              )}

              {/* My Tickets */}
              {view === "my-tickets" && (
                <div className="overflow-y-auto max-h-[50vh]">
                  {tickets.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-sm">
                      لا توجد تذاكر
                    </div>
                  ) : (
                    tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openTicketChat(t)}
                        className="w-full p-3 border-b border-border hover:bg-secondary/30 transition-colors text-right"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            t.status === "open" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                          }`}>
                            {t.status === "open" ? "مفتوحة" : "مغلقة"}
                          </span>
                          <span className="font-medium text-foreground text-sm line-clamp-1">{t.subject}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("ar-SA")}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Ticket Chat */}
              {view === "chat" && selectedTicket && (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[40vh]">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] p-2.5 rounded-xl text-sm ${
                            isMe
                              ? "bg-primary/15 border border-primary/20 text-foreground"
                              : "bg-secondary/70 text-foreground"
                          }`}>
                            {!isMe && (
                              <p className="text-xs text-primary font-medium mb-1">الدعم الفني</p>
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  {selectedTicket.status === "open" && (
                    <div className="p-3 border-t border-border flex gap-2 shrink-0">
                      <input
                        type="text"
                        className="auth-input h-9 text-sm flex-1"
                        placeholder="اكتب رسالتك..."
                        value={newMsg}
                        onChange={(e) => setNewMsg(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendTicketMessage()}
                        maxLength={1000}
                      />
                      <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendTicketMessage} disabled={sending || !newMsg.trim()}>
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* AI Chat */}
              {view === "ai-chat" && (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[40vh]">
                    {aiMessages.length === 0 && (
                      <div className="text-center py-6">
                        <Bot className="w-10 h-10 mx-auto mb-2 text-primary/50" />
                        <p className="text-muted-foreground text-sm">مرحباً! كيف يمكنني مساعدتك؟</p>
                      </div>
                    )}
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] p-2.5 rounded-xl text-sm ${
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
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
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
                  <div className="p-3 border-t border-border flex gap-2 shrink-0">
                    <input
                      type="text"
                      className="auth-input h-9 text-sm flex-1"
                      placeholder="اسأل أي سؤال..."
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !aiLoading && sendAiMessage()}
                      maxLength={2000}
                    />
                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SupportWidget;
