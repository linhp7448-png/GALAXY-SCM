import fs from 'fs';

let html = fs.readFileSync('item_management_mockup.html', 'utf8');

// 1. Add SheetJS
if (!html.includes('xlsx.full.min.js')) {
    html = html.replace('</head>', '  <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>\n</head>');
}

// 2. Add Button & Input
const buttonHTML = `
            <input type="file" id="importFileInput" accept=".xlsx, .csv" style="display:none;" />
            <button class="btn btn-ghost btn-sm" id="btnImportExcel" onclick="document.getElementById('importFileInput').click()">Nhập từ Excel</button>
            <button class="btn btn-ghost btn-sm" id="btnVersionHistory">`;
            
if (!html.includes('id="btnImportExcel"')) {
    html = html.replace('<button class="btn btn-ghost btn-sm" id="btnVersionHistory">', buttonHTML);
}

// 3. Add Import Logic
const importLogic = `
// --- IMPORT EXCEL LOGIC ---
document.getElementById('importFileInput').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  document.getElementById('dataTableBody').innerHTML = '<tr><td colspan="15" style="text-align:center; padding:50px;">Đang xử lý file Excel... Xin vui lòng đợi!</td></tr>';
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    const data = e.target.result;
    const workbook = XLSX.read(data, {type: 'array'});
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('Parsed rows:', rows);
    
    // Validate rows
    if (rows.length === 0) {
      alert("File rỗng!");
      loadDataFromSupabase();
      return;
    }
    
    document.getElementById('dataTableBody').innerHTML = '<tr><td colspan="15" style="text-align:center; padding:50px;">Đang đẩy dữ liệu lên Cloud...</td></tr>';
    
    const sanitizeNum = (val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'string' && val.trim() === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };
    
    try {
      // 1. Locations
      const locationsMap = new Map();
      // 2. Vendors
      const vendorsMap = new Map();
      // 3. Items
      const itemsMap = new Map();
      
      const rawDataArray = [];
      
      for (const row of rows) {
        // Map Excel columns to our DB columns. You might need to adjust these keys based on actual Excel headers.
        // Assumed headers: "Location Code", "Vendor Code", "Vendor Name", "Item No", "Description", "Category", "Region", etc.
        // We'll use a fallback since the JSON keys were: locCode, vendorCode, itemNo...
        const locCode = row['Location Code'] || row['locCode'] || row['Location'];
        const vendorCode = row['Vendor Code'] || row['vendorCode'];
        const vendorName = row['Vendor Name'] || row['vendorName'] || 'Unknown Vendor';
        const itemNo = row['Item No'] || row['itemNo'];
        const desc = row['Description'] || row['desc'] || '';
        const cat = row['Category'] || row['category'] || 'Concession';
        const region = row['Region'] || row['region'] || 'Unknown';
        
        if (locCode) locationsMap.set(locCode, { loc_code: locCode, region: region });
        if (vendorCode) vendorsMap.set(vendorCode, { vendor_code: vendorCode, vendor_name: vendorName });
        if (itemNo) itemsMap.set(itemNo, { item_no: itemNo, description: desc, category: cat });
        
        if (locCode && vendorCode && itemNo) {
          rawDataArray.push({
            loc_code: locCode,
            vendor_code: vendorCode,
            item_no: itemNo,
            sub_desc: row['Sub Description'] || row['subDesc'] || null,
            brand: row['Brand'] || row['brand'] || null,
            purch_unit: row['Purch. Unit'] || row['purchUnit'] || null,
            conversion: sanitizeNum(row['Conversion'] || row['conversion']),
            base_unit: row['Base Unit'] || row['baseUnit'] || null,
            moq: sanitizeNum(row['MOQ'] || row['moq']),
            mov: sanitizeNum(row['MOV'] || row['mov']),
            ship_if: row['Ship If'] || row['shipIf'] || null,
            hsd: sanitizeNum(row['HSD (Ngày)'] || row['hsd']),
            storage: row['Điều kiện bảo quản'] || row['storage'] || null,
            image_url: null
          });
        }
      }
      
      // Upsert
      if (locationsMap.size > 0) await supabaseClient.from('locations').upsert(Array.from(locationsMap.values()));
      if (vendorsMap.size > 0) await supabaseClient.from('vendors').upsert(Array.from(vendorsMap.values()));
      if (itemsMap.size > 0) await supabaseClient.from('items').upsert(Array.from(itemsMap.values()));
      
      // Raw data in chunks
      const chunkSize = 500;
      for (let i = 0; i < rawDataArray.length; i += chunkSize) {
        const chunk = rawDataArray.slice(i, i + chunkSize);
        await supabaseClient.from('raw_data').upsert(chunk);
      }
      
      alert("Đã nhập dữ liệu thành công!");
    } catch(err) {
      console.error(err);
      alert("Lỗi khi nhập liệu: " + err.message);
    }
    
    // Reset file input and reload
    document.getElementById('importFileInput').value = '';
    loadDataFromSupabase();
  };
  reader.readAsArrayBuffer(file);
});
// ----------------------------
`;

if (!html.includes('importFileInput')) {
    html = html.replace('// Gọi hàm load dữ liệu khi DOM sẵn sàng', importLogic + '\n// Gọi hàm load dữ liệu khi DOM sẵn sàng');
}

fs.writeFileSync('item_management_mockup.html', html);
console.log('Added Import Feature successfully!');
