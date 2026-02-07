import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, X, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SupportTicket {
  id: string;
  user_id: string;
  user_email: string;
  subject: string;
  status: string;
  created_at: string;
  closed_at: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const AdminTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("admin-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => fetchTickets())
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_messages" }, () => {
        if (selectedTicket) fetchMessages(selectedTicket.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const selectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const closeTicket = async (ticketId: string) => {
    await supabase
      .from("support_tickets")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", ticketId);
    toast({ title: "تم إغلاق التذكرة" });
    fetchTickets();
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: "closed" });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("ticket_messages").insert({
      ticket_id: selectedTicket.id,
      sender_id: user.id,
      content: newMessage.trim(),
    });

    setNewMessage("");
    fetchMessages(selectedTicket.id);
    setSending(false);
  };

  const openCount = tickets.filter((t) => t.status === "open").length;

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
        <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Ticket className="w-6 h-6 text-primary" />
          تذاكر الدعم الفني
          {openCount > 0 && (
            <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary">
              {openCount} مفتوحة
            </span>
          )}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets List */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">جميع التذاكر</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد تذاكر</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => selectTicket(ticket)}
                  className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-secondary/50 ${
                    selectedTicket?.id === ticket.id ? "bg-secondary/70" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground text-sm line-clamp-1">
                      {ticket.subject}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        ticket.status === "open"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ticket.status === "open" ? "مفتوحة" : "مغلقة"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground" dir="ltr">{ticket.user_email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(ticket.created_at).toLocaleDateString("ar-SA")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail / Chat */}
        <div className="glass-card flex flex-col">
          {selectedTicket ? (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedTicket.subject}</h3>
                  <p className="text-xs text-muted-foreground" dir="ltr">{selectedTicket.user_email}</p>
                </div>
                {selectedTicket.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => closeTicket(selectedTicket.id)}>
                    <X className="w-4 h-4 ml-1" />
                    إغلاق
                  </Button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                {messages.map((msg) => {
                  const isUser = msg.sender_id === selectedTicket.user_id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-xl text-sm ${
                          isUser
                            ? "bg-secondary/50 text-foreground"
                            : "bg-primary/10 border border-primary/20 text-foreground"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.created_at).toLocaleTimeString("ar-SA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply */}
              {selectedTicket.status === "open" && (
                <div className="p-4 border-t border-border flex gap-2">
                  <input
                    type="text"
                    className="auth-input h-10 text-sm flex-1"
                    placeholder="اكتب ردك..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    maxLength={1000}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>اختر تذكرة لعرض المحادثة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTickets;
