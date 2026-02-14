
-- Add new roles to the enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vip_customer';

-- Create a function to auto-assign customer role on first purchase
CREATE OR REPLACE FUNCTION public.assign_customer_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_count integer;
  current_role public.app_role;
BEGIN
  -- Get current role
  SELECT role INTO current_role FROM public.user_roles WHERE user_id = NEW.user_id;
  
  -- Don't override admin/owner roles
  IF current_role IN ('admin', 'owner') THEN
    RETURN NEW;
  END IF;
  
  -- Count orders for this user
  SELECT count(*) INTO order_count FROM public.orders WHERE user_id = NEW.user_id;
  
  -- If 10+ orders, assign VIP
  IF order_count >= 10 THEN
    IF current_role IS NOT NULL THEN
      UPDATE public.user_roles SET role = 'vip_customer' WHERE user_id = NEW.user_id;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'vip_customer')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  ELSE
    -- Assign customer role if no role or member
    IF current_role IS NULL OR current_role = 'member' THEN
      IF current_role IS NOT NULL THEN
        UPDATE public.user_roles SET role = 'customer' WHERE user_id = NEW.user_id;
      ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, 'customer')
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS auto_assign_customer_role ON public.orders;
CREATE TRIGGER auto_assign_customer_role
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.assign_customer_role();
