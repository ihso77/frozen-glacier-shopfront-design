import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Reply, Trash2, Eye, EyeOff, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string;
  content: string;
  is_read: boolean;
  replied_at: string | null;
  reply_content: string | null;
  created_at: string;
}

const AdminMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();

    // الاستماع للرسائل الجديدة
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string, isRead: boolean) => {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: isRead })
      .eq("id", id);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      fetchMessages();
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف", description: "تم حذف الرسالة بنجاح" });
      setSelectedMessage(null);
      fetchMessages();
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;

    setSending(true);

    // حفظ الرد في قاعدة البيانات
    const { error } = await supabase
      .from("messages")
      .update({
        reply_content: replyContent,
        replied_at: new Date().toISOString(),
        is_read: true,
      })
      .eq("id", selectedMessage.id);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "تم إرسال الرد",
        description: `تم حفظ الرد للرسالة من ${selectedMessage.sender_email}`,
      });
      setShowReplyModal(false);
      setReplyContent("");
      fetchMessages();
    }

    setSending(false);
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Mail className="w-6 h-6 text-primary" />
            الرسائل
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary">
                {unreadCount} جديدة
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">إدارة رسائل العملاء والتواصل معهم</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* قائمة الرسائل */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">صندوق الوارد</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد رسائل حالياً</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => {
                    setSelectedMessage(message);
                    if (!message.is_read) markAsRead(message.id, true);
                  }}
                  className={`p-4 border-b border-border cursor-pointer transition-colors hover:bg-secondary/50 ${
                    selectedMessage?.id === message.id ? "bg-secondary/70" : ""
                  } ${!message.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {!message.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      <span className="font-medium text-foreground text-sm">
                        {message.sender_name || message.sender_email}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                    {message.subject}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {message.content}
                  </p>
                  {message.replied_at && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-green-500">
                      <Reply className="w-3 h-3" />
                      تم الرد
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* تفاصيل الرسالة */}
        <div className="glass-card">
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{selectedMessage.subject}</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => markAsRead(selectedMessage.id, !selectedMessage.is_read)}
                    title={selectedMessage.is_read ? "تحديد كغير مقروء" : "تحديد كمقروء"}
                  >
                    {selectedMessage.is_read ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMessage(selectedMessage.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">من:</p>
                  <p className="text-foreground" dir="ltr">
                    {selectedMessage.sender_name && (
                      <span className="font-medium">{selectedMessage.sender_name} </span>
                    )}
                    &lt;{selectedMessage.sender_email}&gt;
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">التاريخ:</p>
                  <p className="text-foreground">
                    {new Date(selectedMessage.created_at).toLocaleString("ar-SA")}
                  </p>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">الرسالة:</p>
                  <div className="p-4 bg-secondary/50 rounded-lg text-foreground whitespace-pre-wrap">
                    {selectedMessage.content}
                  </div>
                </div>

                {selectedMessage.reply_content && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Reply className="w-4 h-4" />
                      ردك:
                    </p>
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-foreground whitespace-pre-wrap">
                      {selectedMessage.reply_content}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedMessage.replied_at &&
                        new Date(selectedMessage.replied_at).toLocaleString("ar-SA")}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-border">
                <Button
                  className="w-full gap-2"
                  onClick={() => setShowReplyModal(true)}
                >
                  <Reply className="w-4 h-4" />
                  {selectedMessage.reply_content ? "تعديل الرد" : "إرسال رد"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>اختر رسالة لعرض تفاصيلها</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نافذة الرد */}
      {showReplyModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">
                الرد على {selectedMessage.sender_name || selectedMessage.sender_email}
              </h2>
              <button
                onClick={() => setShowReplyModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  الموضوع: Re: {selectedMessage.subject}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  محتوى الرد
                </label>
                <textarea
                  className="auth-input min-h-[150px]"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  className="flex-1 gap-2"
                  onClick={handleReply}
                  disabled={!replyContent.trim() || sending}
                >
                  <Send className="w-4 h-4" />
                  {sending ? "جاري الإرسال..." : "إرسال الرد"}
                </Button>
                <Button variant="outline" onClick={() => setShowReplyModal(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMessages;