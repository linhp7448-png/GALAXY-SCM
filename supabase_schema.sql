-- Supabase Schema for Galaxy SCM Item Management

-- 1. Table: locations
CREATE TABLE public.locations (
    loc_code TEXT PRIMARY KEY,
    region TEXT NOT NULL
);

-- 2. Table: vendors
CREATE TABLE public.vendors (
    vendor_code TEXT PRIMARY KEY,
    vendor_name TEXT NOT NULL
);

-- 3. Table: items
-- Lưu ý: Một mặt hàng có thể có một mô tả và ngành hàng chuẩn.
CREATE TABLE public.items (
    item_no TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL
);

-- 4. Table: raw_data (Liên kết Item x Vendor x Location)
-- Đây là bảng dữ liệu thô trung tâm, tương ứng với RAW_ROWS trong JSON.
CREATE TABLE public.raw_data (
    rid UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loc_code TEXT REFERENCES public.locations(loc_code) ON DELETE CASCADE,
    vendor_code TEXT REFERENCES public.vendors(vendor_code) ON DELETE CASCADE,
    item_no TEXT REFERENCES public.items(item_no) ON DELETE CASCADE,
    
    -- Specific override properties for this loc x vendor x item combination
    sub_desc TEXT,
    brand TEXT,
    purch_unit TEXT,
    conversion NUMERIC,
    base_unit TEXT,
    moq NUMERIC,
    mov NUMERIC,
    ship_if TEXT,
    hsd NUMERIC,
    storage TEXT,
    image_url TEXT, -- Lưu URL ảnh sau khi upload lên Supabase Storage
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Row Level Security (RLS) setup
-- Mặc định khoá tất cả các quyền truy cập
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_data ENABLE ROW LEVEL SECURITY;

-- Cấp quyền XEM (SELECT) cho tất cả tài khoản đã đăng nhập (authenticated)
CREATE POLICY "Cho phép tất cả user đăng nhập được xem" 
ON public.raw_data FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cho phép tất cả user đăng nhập được xem" 
ON public.locations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cho phép tất cả user đăng nhập được xem" 
ON public.vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Cho phép tất cả user đăng nhập được xem" 
ON public.items FOR SELECT TO authenticated USING (true);

-- Cấp quyền THÊM/SỬA/XOÁ (INSERT/UPDATE/DELETE) chỉ cho những tài khoản có vai trò admin (Ví dụ admin có email đuôi @galaxy.com.vn)
CREATE POLICY "Chỉ Admin được chỉnh sửa raw_data" 
ON public.raw_data FOR ALL TO authenticated 
USING (auth.jwt() ->> 'email' LIKE '%@galaxy.com.vn%')
WITH CHECK (auth.jwt() ->> 'email' LIKE '%@galaxy.com.vn%');

-- 6. Storage Policies (Cho phép upload ảnh)
-- Mở khóa quyền thêm/sửa/xoá/xem file trong bucket 'item_images' cho tất cả mọi người (để test mockup dễ dàng)
CREATE POLICY "Cho phép thao tác với ảnh" 
ON storage.objects FOR ALL 
USING (bucket_id = 'item_images')
WITH CHECK (bucket_id = 'item_images');
