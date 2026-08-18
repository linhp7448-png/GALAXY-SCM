import fs from 'fs';

let html = fs.readFileSync('item_management_mockup.html', 'utf8');

// 1. Chèn thư viện Supabase JS vào Head
if (!html.includes('supabase-js')) {
    html = html.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n</head>');
}

// 2. Chèn logic tải dữ liệu từ Supabase thay thế cho mảng tĩnh
const SUPABASE_URL = 'https://hotfbncvtkdjkkgpvfor.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGZibmN2dGtkamtrZ3B2Zm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MzcyMzcsImV4cCI6MjEwMjUxMzIzN30.Fn9zEdCqDnZbpB-xqkvM6fiPJKA-yzD8WIimowhOYdg';

const fetchLogic = `
const supabaseUrl = '${SUPABASE_URL}';
const supabaseKey = '${ANON_KEY}';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function loadDataFromSupabase() {
  document.getElementById('dataTableBody').innerHTML = '<tr><td colspan="15" style="text-align:center; padding:50px; font-size: 20px;">Đang kết nối tới Supabase Đám mây...</td></tr>';
  
  // Tạm thời bỏ qua RLS bằng cách gọi một hàm API lấy dữ liệu (Nếu đang khoá auth, ta tạm thời cần mở khoá SQL)
  const { data, error } = await supabase
    .from('raw_data')
    .select('*, items(description, category), vendors(vendor_name), locations(region)');
    
  if (error) {
    document.getElementById('dataTableBody').innerHTML = '<tr><td colspan="15" style="text-align:center; color: red;">' + error.message + '</td></tr>';
    return;
  }
  
  if (!data || data.length === 0) {
    document.getElementById('dataTableBody').innerHTML = '<tr><td colspan="15" style="text-align:center;">Dữ liệu trống hoặc bị chặn bởi bảo mật RLS. Vui lòng mở quyền xem.</td></tr>';
    return;
  }
  
  // Convert relational data back to flat format for RAW_ROWS
  RAW_ROWS = data.map(row => ({
    rid: row.rid,
    locCode: row.loc_code,
    vendorCode: row.vendor_code,
    itemNo: row.item_no,
    subDesc: row.sub_desc,
    brand: row.brand,
    purchUnit: row.purch_unit,
    conversion: row.conversion,
    baseUnit: row.base_unit,
    moq: row.moq,
    mov: row.mov,
    shipIf: row.ship_if,
    hsd: row.hsd,
    storage: row.storage,
    category: row.items ? row.items.category : '',
    desc: row.items ? row.items.description : '',
    vendorName: row.vendors ? row.vendors.vendor_name : '',
    image_url: row.image_url
  }));
  
  // Re-build catalog and render
  DATA = deriveCatalog(RAW_ROWS);
  renderCatalog();
  renderDataTable();
}

// Gọi hàm load dữ liệu khi DOM sẵn sàng
window.addEventListener('DOMContentLoaded', () => {
  loadDataFromSupabase();
});
`;

if (!html.includes('loadDataFromSupabase')) {
    html = html.replace('let seedCounter = 1;', 'let seedCounter = 1;\n' + fetchLogic);
}

fs.writeFileSync('item_management_mockup.html', html);
console.log('Đã chèn code kết nối Supabase thành công!');
