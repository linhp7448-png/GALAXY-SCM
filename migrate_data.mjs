import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ⚠️ BẠN CẦN THAY THẾ 2 BIẾN NÀY BẰNG THÔNG TIN CỦA BẠN
// 1. Lấy Project URL ở trang API Settings
const SUPABASE_URL = 'https://hotfbncvtkdjkkgpvfor.supabase.co'; // Thay bằng URL của bạn nếu khác

// 2. Lấy khóa "service_role secret" (bấm Reveal để hiện ra) thay vì khóa "anon public"
// Vì khoá service_role có quyền bypass RLS (bỏ qua bảo mật) để nạp dữ liệu gốc.
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGZibmN2dGtkamtrZ3B2Zm9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjkzNzIzNywiZXhwIjoyMTAyNTEzMjM3fQ.46G4c8jZ1BKW7-G2do9UQiBk3kJzvMU_R9WahXzWYIE'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateData() {
  console.log('Đang đọc file galaxy_scm_raw_data.json...');
  const rawDataStr = fs.readFileSync('galaxy_scm_raw_data.json', 'utf8');
  const data = JSON.parse(rawDataStr);
  const rows = data.rows;

  console.log(`Tìm thấy ${rows.length} dòng dữ liệu.`);

  // 1. Bóc tách và Insert Locations
  console.log('--- Đang xử lý Locations ---');
  const locationsMap = new Map();
  for (const locCode of data.locations) {
    locationsMap.set(locCode, {
      loc_code: locCode,
      region: data.regionByLocation[locCode] || 'Unknown'
    });
  }
  const locationsArray = Array.from(locationsMap.values());
  const { error: locErr } = await supabase.from('locations').upsert(locationsArray);
  if (locErr) console.error('Lỗi insert locations:', locErr);
  else console.log(`Đã nạp xong ${locationsArray.length} locations.`);

  // 2. Bóc tách và Insert Vendors
  console.log('--- Đang xử lý Vendors ---');
  const vendorsMap = new Map();
  for (const row of rows) {
    if (row.vendorCode) {
      vendorsMap.set(row.vendorCode, {
        vendor_code: row.vendorCode,
        vendor_name: row.vendorName
      });
    }
  }
  const vendorsArray = Array.from(vendorsMap.values());
  const { error: venErr } = await supabase.from('vendors').upsert(vendorsArray);
  if (venErr) console.error('Lỗi insert vendors:', venErr);
  else console.log(`Đã nạp xong ${vendorsArray.length} vendors.`);

  // 3. Bóc tách và Insert Items
  console.log('--- Đang xử lý Items ---');
  const itemsMap = new Map();
  for (const row of rows) {
    if (row.itemNo) {
      itemsMap.set(row.itemNo, {
        item_no: row.itemNo,
        description: row.desc,
        category: row.category
      });
    }
  }
  const itemsArray = Array.from(itemsMap.values());
  const { error: itemErr } = await supabase.from('items').upsert(itemsArray);
  if (itemErr) console.error('Lỗi insert items:', itemErr);
  else console.log(`Đã nạp xong ${itemsArray.length} items.`);

  const sanitizeNum = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string' && val.trim() === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  // 4. Insert Raw Data
  console.log('--- Đang xử lý Raw Data ---');
  const rawDataArray = rows.map(row => ({
    // Bỏ qua row.rid vì Supabase sẽ tự tạo UUID mới
    loc_code: row.locCode,
    vendor_code: row.vendorCode,
    item_no: row.itemNo,
    sub_desc: row.subDesc,
    brand: row.brand,
    purch_unit: row.purchUnit,
    conversion: sanitizeNum(row.conversion),
    base_unit: row.baseUnit,
    moq: sanitizeNum(row.moq),
    mov: sanitizeNum(row.mov),
    ship_if: row.shipIf,
    hsd: sanitizeNum(row.hsd),
    storage: row.storage,
    image_url: null
  }));

  // Chunk array để tránh quá tải API (mỗi lần đẩy 500 dòng)
  const chunkSize = 500;
  for (let i = 0; i < rawDataArray.length; i += chunkSize) {
    const chunk = rawDataArray.slice(i, i + chunkSize);
    const { error: rawErr } = await supabase.from('raw_data').upsert(chunk);
    if (rawErr) {
      console.error(`Lỗi insert raw_data (chunk ${i}):`, rawErr);
    } else {
      console.log(`Đã nạp thành công dòng ${i + 1} đến ${i + chunk.length}`);
    }
  }

  console.log('🎉 Hoàn thành Migrate Data!');
}

migrateData();
