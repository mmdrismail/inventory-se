/**
 * StockLine Universal Multi-Language Dictionary
 * Supports: 'bn' (বাংলা), 'en' (English), 'obro' (Avro / Banglish)
 */

export const LANGUAGES = {
  BN: 'bn',
  EN: 'en',
  OBRO: 'obro',
};

export const LANGUAGE_OPTIONS = [
  { id: 'bn', label: 'বাংলা', nativeName: 'বাংলা (BN)', flag: '🇧🇩' },
  { id: 'en', label: 'English', nativeName: 'English (US)', flag: '🇺🇸' },
  { id: 'obro', label: 'অভ্রো / বাংলিশ', nativeName: 'Banglish / Avro', flag: '🔤' },
];

export const TRANSLATIONS = {
  // Navigation Items
  nav_overview: {
    bn: 'ড্যাশবোর্ড',
    en: 'Overview',
    obro: 'Dashboard',
  },
  nav_products: {
    bn: 'পণ্য তালিকা',
    en: 'Products',
    obro: 'Product List',
  },
  nav_categories: {
    bn: 'ক্যাটাগরি সমূহ',
    en: 'Categories',
    obro: 'Category Shomuho',
  },
  nav_suppliers: {
    bn: 'সরবরাহকারী (সাপ্লায়ার)',
    en: 'Suppliers',
    obro: 'Suppliers',
  },
  nav_customers: {
    bn: 'গ্রাহক ও ক্লায়েন্ট',
    en: 'Customers',
    obro: 'Customer Directory',
  },
  nav_purchases: {
    bn: 'পণ্য ক্রয় (স্টক-ইন)',
    en: 'Purchases',
    obro: 'Purchase Orders',
  },
  nav_sales: {
    bn: 'বিক্রয় ও পিওএস',
    en: 'Sales & POS',
    obro: 'Sales & POS Billing',
  },
  nav_quotations: {
    bn: 'দরপত্র ও কোটেশন',
    en: 'Quotations / RFQs',
    obro: 'Quotations / Dorpotro',
  },
  nav_inventory: {
    bn: 'ইনভেন্টরি ও স্টক',
    en: 'Inventory Control',
    obro: 'Stock Ledger',
  },
  nav_orders: {
    bn: 'কাস্টমার অর্ডার',
    en: 'Customer Orders',
    obro: 'Online Orders',
  },
  nav_reports: {
    bn: 'রিপোর্ট ও বিশ্লেষণ',
    en: 'Reports & Analytics',
    obro: 'Reports & Analytics',
  },
  nav_users: {
    bn: 'ইউজার ম্যানেজমেন্ট',
    en: 'User Management',
    obro: 'User Management',
  },
  nav_settings: {
    bn: 'সিস্টেম সেটিংস',
    en: 'System Settings',
    obro: 'System Settings',
  },

  // Common Header Actions
  action_record_sale: {
    bn: 'নতুন বিক্রয় (Record Sale)',
    en: 'Record Sale',
    obro: 'Notun Sale Entry',
  },
  action_new_quotation: {
    bn: 'নতুন দরপত্র (New Quotation)',
    en: 'New Quotation',
    obro: 'Notun Quotation Banan',
  },
  action_add_product: {
    bn: 'নতুন পণ্য যোগ করুন',
    en: 'Add Product',
    obro: 'Notun Product Add Korun',
  },
  action_add_customer: {
    bn: 'নতুন গ্রাহক যোগ করুন',
    en: 'Add Customer',
    obro: 'Notun Customer Add Korun',
  },
  action_export_csv: {
    bn: 'এক্সপোর্ট CSV',
    en: 'Export CSV',
    obro: 'Export CSV',
  },
  action_refresh: {
    bn: 'রিফ্রেশ',
    en: 'Refresh',
    obro: 'Refresh',
  },
  action_quick_search: {
    bn: 'দ্রুত অনুসন্ধান করুন...',
    en: 'Quick Search...',
    obro: 'Druto Search Korun...',
  },
  action_print: {
    bn: 'প্রিন্ট ভাউচার',
    en: 'Print Receipt',
    obro: 'Print Voucher',
  },
  action_view_details: {
    bn: 'বিস্তারিত দেখুন',
    en: 'View Details',
    obro: 'Bistarito Dekhun',
  },
  action_cancel: {
    bn: 'বাতিল',
    en: 'Cancel',
    obro: 'Batil',
  },
  action_save: {
    bn: 'সংরক্ষণ করুন',
    en: 'Save',
    obro: 'Save Korun',
  },
  action_update: {
    bn: 'আপডেট করুন',
    en: 'Update',
    obro: 'Update Korun',
  },
  action_delete: {
    bn: 'মুছে ফেলুন',
    en: 'Delete',
    obro: 'Delete Korun',
  },

  // Sales & POS Titles
  sales_title: {
    bn: 'বিক্রয় ও পিওএস ইনভয়েসিং',
    en: 'Sales & POS Invoicing',
    obro: 'Sales & POS Invoicing',
  },
  sales_subtitle: {
    bn: 'খুচরা ও পাইকারি বিক্রয় রেকর্ড করুন, স্টক সীমা যাচাই এবং মেমো/চালান প্রিন্ট করুন।',
    en: 'Record retail and wholesale sales, enforce stock limits, and print receipts.',
    obro: 'Khuchra o paikari sales record korun, stock limits o memo/challan print korun.',
  },

  // Table Columns
  col_invoice_no: {
    bn: 'ইনভয়েস #',
    en: 'Invoice #',
    obro: 'Invoice #',
  },
  col_customer: {
    bn: 'ক্রেতা / প্রতিষ্ঠান',
    en: 'Customer',
    obro: 'Customer / Company',
  },
  col_date: {
    bn: 'তারিখ',
    en: 'Date',
    obro: 'Tariqh',
  },
  col_items: {
    bn: 'আইটেম',
    en: 'Items',
    obro: 'Items Count',
  },
  col_subtotal: {
    bn: 'উপ-মোট',
    en: 'Subtotal',
    obro: 'Subtotal',
  },
  col_discount: {
    bn: 'বিশেষ ছাড়',
    en: 'Discount',
    obro: 'Discount',
  },
  col_grand_total: {
    bn: 'সর্বমোট মূল্য',
    en: 'Grand Total',
    obro: 'Grand Total',
  },
  col_payment: {
    bn: 'পরিশোধ স্ট্যাটাস',
    en: 'Payment',
    obro: 'Payment Status',
  },
  col_status: {
    bn: 'ইনভয়েস অবস্থা',
    en: 'Status',
    obro: 'Status',
  },
  col_actions: {
    bn: 'অ্যাকশন',
    en: 'Actions',
    obro: 'Actions',
  },
  col_paid_amount: {
    bn: 'জমা / আদায়',
    en: 'Paid Amount',
    obro: 'Joma / Aday',
  },
  col_due_amount: {
    bn: 'বকেয়া পাওনা',
    en: 'Due Balance',
    obro: 'Baki Pawna',
  },

  // Payment Status Badges
  status_paid: {
    bn: 'পরিশোধিত',
    en: 'PAID',
    obro: 'PAID (Porishodh)',
  },
  status_partial: {
    bn: 'আংশিক জমা',
    en: 'PARTIAL',
    obro: 'PARTIAL (Angshik)',
  },
  status_due: {
    bn: 'বকেয়া',
    en: 'DUE',
    obro: 'DUE (Baki)',
  },
  status_completed: {
    bn: 'সম্পন্ন',
    en: 'COMPLETED',
    obro: 'COMPLETED',
  },
  status_draft: {
    bn: 'খসড়া',
    en: 'DRAFT',
    obro: 'DRAFT',
  },
  status_cancelled: {
    bn: 'বাতিলকৃত',
    en: 'CANCELLED',
    obro: 'CANCELLED',
  },

  // Document Types
  doc_cash_memo: {
    bn: 'ক্যাশ মেমো',
    en: 'CASH MEMO',
    obro: 'Cash Memo',
  },
  doc_challan: {
    bn: 'ডেলিভারী চালান',
    en: 'DELIVERY CHALLAN',
    obro: 'Delivery Challan',
  },
  doc_official_pad: {
    bn: 'অফিসিয়াল প্যাড',
    en: 'OFFICIAL PAD',
    obro: 'Official Pad',
  },
  doc_quotation: {
    bn: 'দরপত্র (কোটেশন)',
    en: 'QUOTATION',
    obro: 'Quotation / Dorpotro',
  },
  doc_thermal: {
    bn: 'থার্মাল রসিদ (POS)',
    en: 'THERMAL RECEIPT',
    obro: 'Thermal Slip',
  },

  // Purchases Module Translations
  purchases_title: {
    bn: 'পণ্য ক্রয় ও লট সংগ্রহ (Procurement)',
    en: 'Procurement & Purchases',
    obro: 'Procurement & Lot Purchases',
  },
  purchases_subtitle: {
    bn: 'আইটেমভিত্তিক পারচেজ অর্ডার এবং জাহাজ অকশন বাল্ক লট ডিসম্যাণ্টল ও র‍্যাক লোকেশন বণ্টন',
    en: 'Item-wise purchase orders, bulk lot intake dismantling, and rack locations.',
    obro: 'Item purchase order ebong auction bulk lot dismantle o rack location.',
  },
  tab_regular_purchases: {
    bn: 'নিয়মিত পারচেজ অর্ডার',
    en: 'Regular Purchases',
    obro: 'Niyomito Purchase Orders',
  },
  tab_lot_purchases: {
    bn: 'জাহাজ নিলাম ও বাল্ক লট কেনা',
    en: 'Ship Auction & Bulk Lots',
    obro: 'Ship Auction & Bulk Lots',
  },
  action_create_purchase: {
    bn: 'নতুন পণ্য ক্রয় (Create Purchase)',
    en: 'Create Purchase',
    obro: 'Notun Purchase Order',
  },
  action_new_lot_entry: {
    bn: 'নতুন নিলাম লট এন্ট্রি',
    en: 'New Auction Lot',
    obro: 'Notun Auction Lot Entry',
  },
  search_purchases_placeholder: {
    bn: 'রেফারেন্স PO নম্বর বা সাপ্লায়ারের নাম দিয়ে খুঁজুন...',
    en: 'Search by reference PO number or supplier name...',
    obro: 'Reference PO ba supplier name diye khujun...',
  },
  col_po_ref: {
    bn: 'পিও রেফারেন্স',
    en: 'PO REFERENCE',
    obro: 'PO REFERENCE',
  },
  col_supplier: {
    bn: 'সরবরাহকারী (সাপ্লায়ার)',
    en: 'SUPPLIER',
    obro: 'SUPPLIER',
  },
  col_date: {
    bn: 'তারিখ',
    en: 'DATE',
    obro: 'DATE',
  },
  col_items: {
    bn: 'আইটেম সংখ্যা',
    en: 'ITEMS',
    obro: 'ITEMS',
  },
  col_total_amount: {
    bn: 'সর্বমোট টাকা',
    en: 'TOTAL AMOUNT',
    obro: 'TOTAL AMOUNT',
  },
  col_payment: {
    bn: 'পরিশোধ অবস্থা',
    en: 'PAYMENT',
    obro: 'PAYMENT',
  },
  col_status: {
    bn: 'অবস্থা',
    en: 'STATUS',
    obro: 'STATUS',
  },
  col_actions: {
    bn: 'অ্যাকশন',
    en: 'ACTIONS',
    obro: 'ACTIONS',
  },
  action_print_barcodes: {
    bn: 'বারকোড স্টিকার প্রিন্ট',
    en: 'Print Barcode Stickers',
    obro: 'Barcode Sticker Print',
  },
  all_suppliers: {
    bn: 'সকল সাপ্লায়ার',
    en: 'All Suppliers',
    obro: 'Shokol Supplier',
  },
  all_order_statuses: {
    bn: 'সকল অর্ডার অবস্থা',
    en: 'All Order Statuses',
    obro: 'Shokol Order Status',
  },
  btn_refresh: {
    bn: 'রিফ্রেশ',
    en: 'Refresh',
    obro: 'Refresh',
  },
  btn_export_csv: {
    bn: 'এক্সপোর্ট CSV',
    en: 'Export CSV',
    obro: 'Export CSV',
  },
  status_received: {
    bn: 'গৃহীত (ইন-স্টক)',
    en: 'RECEIVED',
    obro: 'RECEIVED',
  },
  status_pending: {
    bn: 'অপেক্ষমাণ',
    en: 'PENDING',
    obro: 'PENDING',
  },
  barcode_scanner_title: {
    bn: 'বারকোড স্ক্যানার',
    en: 'Barcode Scanner',
    obro: 'Barcode Scanner',
  },
  scan_barcode_input_placeholder: {
    bn: 'বারকোড স্ক্যান করুন বা SKU টাইপ করুন...',
    en: 'Scan barcode or type SKU...',
    obro: 'Barcode scan korun ba SKU type korun...',
  },
  create_purchase_title: {
    bn: 'নতুন পারচেজ অর্ডার তৈরি (Procurement Intake)',
    en: 'Create Purchase Order (Procurement Intake)',
    obro: 'Notun Purchase Order Toiri',
  },
  create_purchase_subtitle: {
    bn: 'সাপ্লায়ার থেকে পণ্য ক্রয় অর্ডার তৈরি করুন। রিসিভ হিসেবে সেভ করলে স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে স্টক যুক্ত হবে।',
    en: 'Issue a supplier purchase order. Saving as Received immediately adds inventory and creates audit movements.',
    obro: 'Supplier theke purchase order entry din. Received save korle stock barbe.',
  },
  back_to_purchases: {
    bn: 'পারচেজ তালিকায় ফিরে যান',
    en: 'Back to Purchases',
    obro: 'Purchases List e Phire Jan',
  },
  supplier_label: {
    bn: 'সাপ্লায়ার / ভেন্ডর',
    en: 'Supplier / Vendor',
    obro: 'Supplier / Vendor',
  },
  new_supplier_btn: {
    bn: 'নতুন সাপ্লায়ার',
    en: 'New Supplier',
    obro: 'Notun Supplier',
  },
  po_reference_label: {
    bn: 'পিও রেফারেন্স নম্বর',
    en: 'PO Reference Number',
    obro: 'PO Reference Number',
  },
  purchase_date_label: {
    bn: 'ক্রয়ের তারিখ',
    en: 'Purchase Date',
    obro: 'Purchase Date',
  },
  payment_status_label: {
    bn: 'পরিশোধ অবস্থা',
    en: 'Payment Status',
    obro: 'Payment Status',
  },
  invoice_notes_label: {
    bn: 'রেফারেন্স বা চালান নোট',
    en: 'Reference / Invoice Note',
    obro: 'Reference ba Challan Note',
  },
  purchased_products_heading: {
    bn: 'ক্রয়কৃত পণ্য ও পরিমাণ (Purchased Products & Quantities)',
    en: 'Purchased Products & Quantities',
    obro: 'Kroykrito Products o Poriman',
  },
  add_item_line_btn: {
    bn: 'আইটেম লাইন যোগ করুন',
    en: 'Add Item Line',
    obro: 'Item Line Jog Korun',
  },
  product_col_label: {
    bn: 'পণ্য নির্বাচন',
    en: 'Product',
    obro: 'Product',
  },
  quantity_col_label: {
    bn: 'পরিমাণ (Qty)',
    en: 'Quantity',
    obro: 'Quantity',
  },
  unit_cost_col_label: {
    bn: 'একক কেনা দর (Unit Cost)',
    en: 'Unit Cost',
    obro: 'Unit Cost',
  },
  line_total_col_label: {
    bn: 'মোট (Total)',
    en: 'Total',
    obro: 'Total',
  },
  save_as_draft_btn: {
    bn: 'খসড়া হিসেবে সেভ করুন',
    en: 'Save as Draft',
    obro: 'Draft hishebe Save Korun',
  },
  receive_purchase_btn: {
    bn: 'পারচেজ রিসিভ ও স্টক বৃদ্ধি করুন',
    en: 'Receive Purchase & Add Stock',
    obro: 'Receive Purchase & Add Stock',
  },
  preview_barcode_stickers_btn: {
    bn: '👁️ বারকোড স্টিকার প্রিভিউ ও প্রিন্ট',
    en: '👁️ Preview & Print Stickers',
    obro: '👁️ Preview Barcode Stickers',
  },
  chk_print_labels_on_receive: {
    bn: 'পণ্য রিসিভ করার সাথে সাথে বারকোড ও র‍্যাক স্টিকার প্রিন্ট করুন (Open Barcode & Rack Sticker Labels Print Preview)',
    en: 'Open Barcode & Rack Sticker Labels Print Preview upon receiving',
    obro: 'Receive korar shathe barcode o rack sticker label print preview open korun',
  },
  btn_scan_add: {
    bn: 'যোগ করুন',
    en: 'Add to Order',
    obro: 'Jog Korun',
  },
  payment_paid: {
    bn: 'সম্পূর্ণ পরিশোধিত (Paid in Full)',
    en: 'Paid in Full',
    obro: 'Paid in Full',
  },
  payment_pending: {
    bn: 'বাকি / অপেক্ষমাণ (Payment Pending / Credit)',
    en: 'Payment Pending / Credit',
    obro: 'Payment Pending / Credit',
  },
  btn_cancel: {
    bn: 'বাতিল',
    en: 'Cancel',
    obro: 'Batil',
  },

  // Products Catalog Module Translations
  products_title: {
    bn: 'পণ্যের ক্যাটালগ ও তালিকা',
    en: 'Products Catalog',
    obro: 'Products Catalog',
  },
  products_subtitle: {
    bn: 'ইনভেন্টরি মালামাল, গোপন মূল্য কোড, এসকেইউ ও রিয়র্ডার লেভেল পরিচালনা করুন।',
    en: 'Manage your inventory items, pricing margins, SKUs, and reorder levels.',
    obro: 'Inventory items, pricing, SKUs ebong reorder level manage korun.',
  },
  btn_add_product: {
    bn: 'নতুন পণ্য যোগ করুন',
    en: 'Add Product',
    obro: 'Notun Product',
  },
  btn_import_csv: {
    bn: 'ইমপোর্ট CSV',
    en: 'Import CSV',
    obro: 'Import CSV',
  },
  search_products_placeholder: {
    bn: 'পণ্যের নাম, পার্টস মডেল, বারকোড বা SKU দিয়ে খুঁজুন...',
    en: 'Search by product name, model, barcode or SKU...',
    obro: 'Product name, model, barcode ba SKU diye search korun...',
  },
  all_categories: {
    bn: 'সকল ক্যাটাগরি',
    en: 'All Categories',
    obro: 'Shokol Category',
  },
  all_stock_statuses: {
    bn: 'সকল স্টক অবস্থা',
    en: 'All Stock Statuses',
    obro: 'Shokol Stock Status',
  },
  filter_in_stock: {
    bn: 'পর্যাপ্ত স্টক (In Stock)',
    en: 'In Stock (> reorder point)',
    obro: 'In Stock',
  },
  filter_low_stock: {
    bn: 'কম স্টক (Low Stock)',
    en: 'Low Stock (≤ reorder point)',
    obro: 'Low Stock',
  },
  filter_out_of_stock: {
    bn: 'স্টক শেষ (Out of Stock)',
    en: 'Out of Stock (0 units)',
    obro: 'Out of Stock',
  },
  btn_reset_filters: {
    bn: 'ফিল্টার রিসেট',
    en: 'Reset Filters',
    obro: 'Reset Filters',
  },
  col_product_details: {
    bn: 'পণ্যের বিবরণ ও নাম',
    en: 'PRODUCT DETAILS',
    obro: 'Product Details',
  },
  col_sku: {
    bn: 'এসকেইউ ও লোকেশন',
    en: 'SKU & LOCATION',
    obro: 'SKU & Location',
  },
  col_category: {
    bn: 'ক্যাটাগরি',
    en: 'CATEGORY',
    obro: 'Category',
  },
  col_selling_price: {
    bn: 'বিক্রয় মূল্য',
    en: 'SELL PRICE',
    obro: 'Selling Price',
  },
  col_cost_price: {
    bn: 'ক্রয় মূল্য (গোপন)',
    en: 'COST PRICE',
    obro: 'Cost Price',
  },
  col_on_hand: {
    bn: 'মজুদ পরিমাণ',
    en: 'ON HAND',
    obro: 'On Hand',
  },
  col_status_label: {
    bn: 'স্টক অবস্থা',
    en: 'STATUS',
    obro: 'Status',
  },
  col_actions_label: {
    bn: 'অ্যাকশন',
    en: 'ACTIONS',
    obro: 'Actions',
  },

  // Common UI Placeholders & Alerts
  placeholder_search_sales: {
    bn: 'ইনভয়েস নম্বর বা কাস্টমারের নাম দিয়ে খুঁজুন...',
    en: 'Search by invoice number or customer name...',
    obro: 'Invoice number ba customer name diye search korun...',
  },
  all_customers: {
    bn: 'সকল কাস্টমার',
    en: 'All Customers',
    obro: 'Shokol Customer',
  },
  all_statuses: {
    bn: 'সকল স্ট্যাটাস',
    en: 'All Invoice Statuses',
    obro: 'Shokol Status',
  },

  // Navigation Sections
  nav_section_operations: {
    bn: 'ম্যানেজমেন্ট ও অপারেশন',
    en: 'Operations',
    obro: 'Operations',
  },
  nav_section_storefront: {
    bn: 'অনলাইন ক্যাটালগ ও শপ',
    en: 'Storefront',
    obro: 'Storefront',
  },
  nav_customer_shop: {
    bn: 'গ্রাহক স্টোরফ্রন্ট (Shop)',
    en: 'Customer Shop',
    obro: 'Customer Shop',
  },
  nav_overview: {
    bn: 'ড্যাশবোর্ড',
    en: 'Dashboard',
    obro: 'Dashboard',
  },
  nav_products: {
    bn: 'পণ্য তালিকা',
    en: 'Products',
    obro: 'Products',
  },
  nav_price_list: {
    bn: 'মেশিন ও প্রাইস লিস্ট',
    en: 'Machine & Price List',
    obro: 'Machine o Price List',
  },
  nav_categories: {
    bn: 'ক্যাটাগরি সমূহ',
    en: 'Categories',
    obro: 'Categories',
  },
  nav_suppliers: {
    bn: 'সরবরাহকারী (সাপ্লায়ার)',
    en: 'Suppliers',
    obro: 'Suppliers',
  },
  nav_customers: {
    bn: 'গ্রাহক ও ক্লায়েন্ট',
    en: 'Customers',
    obro: 'Customers',
  },
  nav_purchases: {
    bn: 'পণ্য ক্রয় (স্টক-ইন)',
    en: 'Purchases',
    obro: 'Purchases',
  },
  nav_sales: {
    bn: 'বিক্রয় ও পিওএস',
    en: 'Sales & POS',
    obro: 'Sales & POS',
  },
  nav_quotations: {
    bn: 'দরপত্র ও কোটেশন',
    en: 'Quotations',
    obro: 'Quotations',
  },
  nav_offline_entries: {
    bn: 'খাতা ও অফলাইন (OCR)',
    en: 'Offline Ledger (OCR)',
    obro: 'Khata o Offline (OCR)',
  },
  nav_inventory: {
    bn: 'ইনভেন্টরি ও স্টক',
    en: 'Inventory',
    obro: 'Inventory',
  },
  nav_orders: {
    bn: 'অনলাইন অর্ডার',
    en: 'Customer Orders',
    obro: 'Customer Orders',
  },
  nav_reports: {
    bn: 'রিপোর্টস ও অ্যানালিটিক্স',
    en: 'Reports & Analytics',
    obro: 'Reports & Analytics',
  },
  nav_users: {
    bn: 'ব্যবহারকারী ব্যবস্থাপনা',
    en: 'User Management',
    obro: 'User Management',
  },
  nav_settings: {
    bn: 'সিস্টেম সেটিংস',
    en: 'Settings',
    obro: 'Settings',
  },

  // Dashboard Overview Module
  dashboard_title: {
    bn: 'ইনভেন্টরি ও সেলস ড্যাশবোর্ড',
    en: 'Inventory & Sales Dashboard',
    obro: 'Inventory & Sales Dashboard',
  },
  dashboard_subtitle: {
    bn: 'রিয়েল-টাইম পারফরম্যান্স মেট্রিক্স, মজুদ মালামাল ও সেলস ভেলোসিটি বিশ্লেষণ।',
    en: 'Real-time performance metrics computed from current local records.',
    obro: 'Real-time performance metrics o sales velocity bishleshon.',
  },
  dashboard_range: {
    bn: 'সময়সীমা:',
    en: 'Range:',
    obro: 'Range:',
  },
  days_count: {
    bn: 'দিন',
    en: 'Days',
    obro: 'Days',
  },
  kpi_total_products: {
    bn: 'মোট পণ্য সংখ্যা',
    en: 'Total Products',
    obro: 'Total Products',
  },
  kpi_total_products_sub: {
    bn: 'টি আইটেম স্টকে বিদ্যমান',
    en: 'units in stock',
    obro: 'units in stock',
  },
  kpi_stock_valuation: {
    bn: 'মোট ইনভেন্টরি মূল্য',
    en: 'Stock Valuation',
    obro: 'Stock Valuation',
  },
  kpi_stock_valuation_sub: {
    bn: 'ক্রয়মূল্য ভিত্তিক মূল্যায়ন',
    en: 'Total cost value',
    obro: 'Total cost value',
  },
  kpi_low_stock: {
    bn: 'কম স্টকের সতর্কতা',
    en: 'Low Stock Items',
    obro: 'Low Stock Items',
  },
  kpi_low_stock_sub: {
    bn: 'টি আইটেমের স্টক শেষ',
    en: 'out of stock',
    obro: 'out of stock',
  },
  kpi_today_sales: {
    bn: 'আজকের মোট বিক্রয়',
    en: "Today's Sales",
    obro: "Today's Sales",
  },
  kpi_today_sales_sub: {
    bn: 'সম্পন্নকৃত চালান ও ইনভয়েস',
    en: 'Completed invoices',
    obro: 'Completed invoices',
  },
  kpi_customers: {
    bn: 'নথিভুক্ত গ্রাহক',
    en: 'Customers',
    obro: 'Customers',
  },
  kpi_customers_sub: {
    bn: 'রিটেইল ও করপোরেট ক্লায়েন্ট',
    en: 'Retail & corporate',
    obro: 'Retail & corporate',
  },
  kpi_pending_orders: {
    bn: 'অপেক্ষমাণ অর্ডার',
    en: 'Pending Orders',
    obro: 'Pending Orders',
  },
  kpi_pending_orders_sub: {
    bn: 'অনলাইন শপ চেকআউট',
    en: 'Storefront checkout',
    obro: 'Storefront checkout',
  },
  chart_sales_velocity: {
    bn: 'দৈনিক বিক্রয় আয় ভেলোসিটি',
    en: 'Sales Revenue Velocity',
    obro: 'Sales Revenue Velocity',
  },
  chart_sales_velocity_sub: {
    bn: 'বিগত সময়ের সম্পন্নকৃত দৈনন্দিন বিক্রির গ্রাফচিত্র',
    en: 'Daily completed sales total over selected days',
    obro: 'Daily completed sales total',
  },
  chart_category_dist: {
    bn: 'ক্যাটাগরিভিত্তিক স্টক বিন্যাস',
    en: 'Inventory by Category',
    obro: 'Inventory by Category',
  },
  chart_category_dist_sub: {
    bn: 'বিভিন্ন ডিপার্টমেন্টের মালামালের অনুপাত',
    en: 'Units breakdown across active product departments',
    obro: 'Units breakdown across active departments',
  },
  chart_procurement: {
    bn: 'সাপ্লায়ার প্রকিউরমেন্ট ইনটেক',
    en: 'Supplier Procurement Intake',
    obro: 'Supplier Procurement Intake',
  },
  chart_procurement_sub: {
    bn: 'বিগত দিনগুলোতে সরবরাহকারী থেকে গৃহীত মালামাল',
    en: 'Purchases received over the selected period',
    obro: 'Purchases received over the selected period',
  },
  alert_low_stock_title: {
    bn: 'জরুরি রিস্টক অ্যালার্ট',
    en: 'Low Stock Alerts',
    obro: 'Low Stock Alerts',
  },
  alert_low_stock_sub: {
    bn: 'যেসব মালামাল অবিলম্বে অর্ডার করা প্রয়োজন',
    en: 'Items requiring replenishment',
    obro: 'Items requiring replenishment',
  },
  btn_view_all: {
    bn: 'সব দেখুন →',
    en: 'View All →',
    obro: 'View All →',
  },

  // Quick Actions Bar
  qa_add_product: {
    bn: 'নতুন পণ্য এন্ট্রি',
    en: 'Add Product',
    obro: 'Add Product',
  },
  qa_record_purchase: {
    bn: 'পণ্য ক্রয় অর্ডার',
    en: 'Record Purchase',
    obro: 'Record Purchase',
  },
  qa_record_sale: {
    bn: 'ক্যাশ মেমো / সেলস',
    en: 'Record Sale',
    obro: 'Record Sale',
  },
  qa_add_customer: {
    bn: 'নতুন গ্রাহক যোগ',
    en: 'Add Customer',
    obro: 'Add Customer',
  },
  qa_stock_adjust: {
    bn: 'স্টক সমন্বয় (অডিট)',
    en: 'Stock Adjustment',
    obro: 'Stock Adjustment',
  },
  qa_view_reports: {
    bn: 'রিপোর্টস দেখুন',
    en: 'View Reports',
    obro: 'View Reports',
  },

  // Inventory & Movements Module
  inventory_title: {
    bn: 'ইনভেন্টরি ও স্টক নিয়ন্ত্রণ (Warehouse Control)',
    en: 'Inventory & Stock Control',
    obro: 'Inventory & Stock Control',
  },
  inventory_subtitle: {
    bn: 'রিয়েল-টাইম গুদাম স্টক, রিয়র্ডার থ্রেশহোল্ড এবং পূর্ণাঙ্গ অডিট মুভমেন্ট খতিয়ান।',
    en: 'Real-time on-hand stock quantities, reorder thresholds, and complete audit movement history.',
    obro: 'Real-time warehouse stock ebong complete audit movement ledger.',
  },
  tab_current_stock: {
    bn: 'বর্তমান স্টক লেভেল',
    en: 'Current Stock Levels',
    obro: 'Current Stock Levels',
  },
  tab_movement_ledger: {
    bn: 'মুভমেন্ট অডিট লেজার',
    en: 'Movement Audit Ledger',
    obro: 'Movement Audit Ledger',
  },
  btn_stock_adjustment: {
    bn: 'স্টক সমন্বয় (Adjust)',
    en: 'Stock Adjustment',
    obro: 'Stock Adjustment',
  },
  modal_adjust_title: {
    bn: 'ইনভেন্টরি স্টক সমন্বয় ভাউচার (Audit Adjustment)',
    en: 'Inventory Stock Adjustment Voucher',
    obro: 'Inventory Stock Adjustment Voucher',
  },
  modal_adjust_sub: {
    bn: 'ফিজিক্যাল গুদাম গণনার সাথে ডিজিটাল স্টক মেলাতে বা ক্ষতিগ্রস্ত মাল সমন্বয় করতে এন্ট্রি দিন।',
    en: 'Reconcile digital stock with physical shelf count or damaged items.',
    obro: 'Physical shelf count er shathe digital stock reconcile korun.',
  },
  col_product: {
    bn: 'পণ্যের নাম ও স্পেক্স',
    en: 'PRODUCT NAME',
    obro: 'Product Name',
  },
  col_stock_level: {
    bn: 'বর্তমান মজুদ',
    en: 'STOCK LEVEL',
    obro: 'Stock Level',
  },
  col_reorder_point: {
    bn: 'রিয়র্ডার সীমা',
    en: 'REORDER POINT',
    obro: 'Reorder Point',
  },
  col_valuation: {
    bn: 'মোট মূল্যমান',
    en: 'VALUATION',
    obro: 'Valuation',
  },
  col_last_movement: {
    bn: 'সর্বশেষ মুভমেন্ট',
    en: 'LAST MOVEMENT',
    obro: 'Last Movement',
  },

  // Categories Module
  categories_title: {
    bn: 'পণ্য ক্যাটাগরি ও ডিপার্টমেন্ট',
    en: 'Categories & Departments',
    obro: 'Categories & Departments',
  },
  categories_subtitle: {
    bn: 'মালামালের সুবিন্যস্ত শ্রেণিবিভাগ এবং পার্টসের ডিপার্টমেন্ট পরিচালনা করুন।',
    en: 'Organize machinery parts, tools, gases and consumables by departments.',
    obro: 'Machinery parts, tools, gases ebong consumables categorize korun.',
  },
  btn_add_category: {
    bn: 'নতুন ক্যাটাগরি',
    en: 'New Category',
    obro: 'New Category',
  },
  col_category_name: {
    bn: 'ক্যাটাগরির নাম',
    en: 'CATEGORY NAME',
    obro: 'Category Name',
  },
  col_description: {
    bn: 'বিবরণ',
    en: 'DESCRIPTION',
    obro: 'Description',
  },
  col_product_count: {
    bn: 'সংযুক্ত পণ্য সংখ্যা',
    en: 'ITEMS COUNT',
    obro: 'Items Count',
  },

  // Customers Module
  customers_title: {
    bn: 'গ্রাহক ও ক্লায়েন্ট তালিকা',
    en: 'Customer & Client Directory',
    obro: 'Customer Directory',
  },
  customers_subtitle: {
    bn: 'খুচরা ক্রেতা, কোল্ড স্টোরেজ মালিক, ইঞ্জিনিয়ারিং এজেন্ট ও করপোরেট ক্লায়েন্ট প্রোফাইল।',
    en: 'Retail buyers, cold storage plant owners, marine agents, and corporate accounts.',
    obro: 'Retail buyers, cold storage plant owners ebong corporate accounts.',
  },
  btn_add_customer: {
    bn: 'নতুন ক্লায়েন্ট',
    en: 'Add Customer',
    obro: 'Add Customer',
  },
  col_client_name: {
    bn: 'গ্রাহক ও প্রতিষ্ঠান',
    en: 'CLIENT & COMPANY',
    obro: 'Client & Company',
  },
  col_role_designation: {
    bn: 'পদবী ও ভূমিকা',
    en: 'ROLE / DESIGNATION',
    obro: 'Role / Designation',
  },
  col_contact_info: {
    bn: 'যোগাযোগ ও ঠিকানা',
    en: 'CONTACT & ADDRESS',
    obro: 'Contact & Address',
  },
  col_total_due: {
    bn: 'বর্তমান বকেয়া (Due)',
    en: 'OUTSTANDING DUE',
    obro: 'Outstanding Due',
  },

  // Suppliers Module
  suppliers_title: {
    bn: 'সরবরাহকারী ও ভেন্ডর তালিকা',
    en: 'Suppliers & Vendors Directory',
    obro: 'Suppliers Directory',
  },
  suppliers_subtitle: {
    bn: 'জাহাজ অকশন ইয়ার্ড, লোকাল ডিলার, আন্তর্জাতিক পার্টস সরবরাহকারী ও ভেন্ডর একাউন্ট।',
    en: 'Ship breaking yards, local auctioneers, direct OEM importers, and parts vendors.',
    obro: 'Ship breaking yards, local auctioneers ebong OEM importers.',
  },
  btn_add_supplier: {
    bn: 'নতুন ভেন্ডর',
    en: 'Add Supplier',
    obro: 'Add Supplier',
  },
  col_supplier_name: {
    bn: 'সরবরাহকারী ও প্রতিষ্ঠান',
    en: 'SUPPLIER & COMPANY',
    obro: 'Supplier & Company',
  },
  col_purchases_count: {
    bn: 'মোট পারচেজ সংখ্যা',
    en: 'PURCHASE ORDERS',
    obro: 'Purchase Orders',
  },
  col_total_spent: {
    bn: 'মোট কেনাকাটা',
    en: 'TOTAL SPENT',
    obro: 'Total Spent',
  },

  // Reports Module
  reports_title: {
    bn: 'ব্যবসায়িক অ্যানালিটিক্স ও রিপোর্টস',
    en: 'Business Analytics & Reports',
    obro: 'Analytics & Reports',
  },
  reports_subtitle: {
    bn: 'ইনভেন্টরি ভ্যালুয়েশন, বিক্রয় মার্জিন, পারচেজ হিস্টোরি ও আর্থিক সারসংক্ষেপ।',
    en: 'Comprehensive inventory valuation, profit margins, and procurement analytics.',
    obro: 'Inventory valuation, profit margins ebong procurement analytics.',
  },
  tab_rep_inventory: {
    bn: 'ইনভেন্টরি রিপোর্ট',
    en: 'Inventory Report',
    obro: 'Inventory Report',
  },
  tab_rep_sales: {
    bn: 'বিক্রয় ও রাজস্ব',
    en: 'Sales & Revenue',
    obro: 'Sales & Revenue',
  },
  tab_rep_purchases: {
    bn: 'ক্রয় ও সংগ্রহ',
    en: 'Procurement Intake',
    obro: 'Procurement Intake',
  },
  tab_rep_low_stock: {
    bn: 'রিস্টক অ্যানালাইসিস',
    en: 'Restock Analysis',
    obro: 'Restock Analysis',
  },

  // Missing Action & Empty-State Keys
  no_products_found: {
    bn: 'কোনো পণ্য খুঁজে পাওয়া যায়নি',
    en: 'No products found',
    obro: 'Kono product paoa jayni',
  },
  receive_order_now: {
    bn: 'এখনই পণ্য গ্রহণ করুন',
    en: 'Receive Order Now',
    obro: 'Ekhoni Order Receive Korun',
  },
  cancel_order: {
    bn: 'অর্ডার বাতিল করুন',
    en: 'Cancel Order',
    obro: 'Order Batil Korun',
  },
};

/**
 * Translation helper function
 */
export const getTranslation = (key, lang = 'bn', fallback = '') => {
  const entry = TRANSLATIONS[key];
  if (!entry) return fallback || key;
  return entry[lang] || entry['bn'] || entry['en'] || fallback || key;
};
