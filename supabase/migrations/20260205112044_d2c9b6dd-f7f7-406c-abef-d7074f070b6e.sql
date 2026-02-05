-- جدول الرسائل للتواصل
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  replied_at TIMESTAMPTZ,
  reply_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بإرسال رسائل
CREATE POLICY "Anyone can send messages"
ON public.messages FOR INSERT
WITH CHECK (true);

-- السماح للأدمن والمالك بقراءة الرسائل
CREATE POLICY "Admin can read messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  public.is_admin_or_owner(auth.uid())
);

-- السماح للأدمن والمالك بتحديث الرسائل
CREATE POLICY "Admin can update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (public.is_admin_or_owner(auth.uid()))
WITH CHECK (public.is_admin_or_owner(auth.uid()));

-- السماح للأدمن والمالك بحذف الرسائل
CREATE POLICY "Admin can delete messages"
ON public.messages FOR DELETE
TO authenticated
USING (public.is_admin_or_owner(auth.uid()));

-- تحديث الأقسام لتكون يوزرات واشتراكات فقط
DELETE FROM public.categories;

INSERT INTO public.categories (name, description, icon, display_order, is_active) VALUES
('يوزرات', 'حسابات وأسماء مستخدمين مميزة', 'user', 1, true),
('اشتراكات', 'اشتراكات المنصات والخدمات', 'credit-card', 2, true);

-- تفعيل Realtime للرسائل
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;