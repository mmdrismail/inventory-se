const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Category = require('./models/Category');
const Supplier = require('./models/Supplier');
const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Purchase = require('./models/Purchase');
const Sale = require('./models/Sale');
const StockMovement = require('./models/StockMovement');
const Order = require('./models/Order');
const Setting = require('./models/Setting');

const seedUsers = [
  {
    name: 'Sarah Rahman',
    email: 'admin@stockline.io',
    password: 'admin123',
    role: 'admin',
    phone: '+880 1711 112233',
    status: 'active',
  },
  {
    name: 'Tanvir Hossain',
    email: 'manager@stockline.io',
    password: 'manager123',
    role: 'manager',
    phone: '+880 1812 445566',
    status: 'active',
  },
  {
    name: 'Anika Tabassum',
    email: 'staff@stockline.io',
    password: 'staff123',
    role: 'staff',
    phone: '+880 1913 778899',
    status: 'active',
  },
  {
    name: 'Rafiqul Islam',
    email: 'customer@stockline.io',
    password: 'customer123',
    role: 'customer',
    phone: '+880 1614 001122',
    status: 'active',
  },
];

const seedCategories = [
  { name: 'Electronics', description: 'Consumer electronic devices, wearables & accessories', color: 'blue' },
  { name: 'Computer Hardware', description: 'Laptops, desktop processors, monitors and PC components', color: 'emerald' },
  { name: 'Office Supplies', description: 'Paper, ergonomic seating, desks and stationery essentials', color: 'amber' },
  { name: 'Networking Equipment', description: 'Routers, gigabit switches, Cat6 patch cables & wireless APs', color: 'purple' },
  { name: 'Audio & Visual', description: 'Studio microphones, webcams, noise-cancelling headphones', color: 'red' },
  { name: 'Storage & Memory', description: 'NVMe SSDs, external hard drives, DDR5 RAM modules', color: 'indigo' },
];

const seedSuppliers = [
  { name: 'Apex Global Distributors', contactPerson: 'Karim Ullah', email: 'sales@apexglobal.bd', phone: '+880 1711 998877', address: 'Motijheel C/A, Dhaka-1000', status: 'active' },
  { name: 'Silicon Valley Direct', contactPerson: 'Mahmud Hasan', email: 'orders@siliconvalleydirect.com', phone: '+880 1819 223344', address: 'IDB Bhaban, Agargaon, Dhaka', status: 'active' },
  { name: 'Dhaka Tech Importers', contactPerson: 'Farhana Akhter', email: 'info@dhakatech.com.bd', phone: '+880 1912 556677', address: 'Elephant Road, Multiplan Center, Dhaka', status: 'active' },
  { name: 'Prime Office Essentials', contactPerson: 'Shahidul Alam', email: 'corporate@primeoffice.bd', phone: '+880 1618 334455', address: 'Kawran Bazar, Dhaka-1215', status: 'active' },
  { name: 'Bay Micro Systems', contactPerson: 'Zakir Ahmed', email: 'supply@baymicro.com', phone: '+880 1517 889900', address: 'Agrabad C/A, Chattogram', status: 'active' },
];

const seedCustomers = [
  { name: 'TechSolutions BD Ltd.', email: 'procurement@techsolutions.com.bd', phone: '+880 1713 001122', address: 'Gulshan-1, Dhaka', city: 'Dhaka', type: 'corporate', balance: 0 },
  { name: 'Delta Engineering Works', email: 'accounts@delta-eng.net', phone: '+880 1814 334455', address: 'Tejgaon I/A, Dhaka', city: 'Dhaka', type: 'wholesale', balance: 0 },
  { name: 'Green Valley Academy', email: 'admin@greenvalley.edu.bd', phone: '+880 1915 667788', address: 'Uttara Sector 7, Dhaka', city: 'Dhaka', type: 'corporate', balance: 0 },
  { name: 'MicroNet Cyber Cafe', email: 'owner@micronetbd.com', phone: '+880 1616 990011', address: 'Mirpur-10, Dhaka', city: 'Dhaka', type: 'retail', balance: 0 },
  { name: 'Mahir Chowdhury', email: 'mahir.chowdhury@gmail.com', phone: '+880 1518 223344', address: 'Dhanmondi 27, Dhaka', city: 'Dhaka', type: 'retail', balance: 0 },
];

const seedProducts = [
  {
    name: 'Dell XPS 15 InfinityEdge Laptop',
    sku: 'LAP-DELL-XPS15',
    barcode: '884116378291',
    description: '15.6" OLED 3.5K display, Intel Core i7-13700H, 32GB DDR5 RAM, 1TB NVMe SSD.',
    costPrice: 165000,
    sellingPrice: 195000,
    quantity: 8,
    reorderLevel: 5,
    unit: 'pcs',
    isPublic: true,
    imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Logitech MX Master 3S Wireless Mouse',
    sku: 'MOU-LOG-MX3S',
    barcode: '097855174382',
    description: 'Quiet clicks, 8K DPI any-surface tracking, MagSpeed electromagnetic scrolling.',
    costPrice: 9500,
    sellingPrice: 12500,
    quantity: 24,
    reorderLevel: 10,
    unit: 'pcs',
    isPublic: true,
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Samsung 990 PRO 2TB NVMe M.2 SSD',
    sku: 'SSD-SAM-990P2T',
    barcode: '887276707324',
    description: 'PCIe 4.0 NVMe M.2 internal gaming and workstation SSD up to 7,450 MB/s read speed.',
    costPrice: 17500,
    sellingPrice: 22000,
    quantity: 16,
    reorderLevel: 8,
    unit: 'pcs',
    isPublic: true,
    imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'TP-Link Archer AX73 WiFi 6 Router',
    sku: 'NET-TPL-AX73',
    barcode: '693536401024',
    description: 'Dual-Band Gigabit Wi-Fi 6 router, 5400 Mbps speed, 6 high-gain antennas.',
    costPrice: 10500,
    sellingPrice: 13500,
    quantity: 12,
    reorderLevel: 5,
    unit: 'pcs',
    isPublic: true,
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop&q=60',
  },
  {
    name: 'Keychron Q1 Pro Wireless Mechanical Keyboard',
    sku: 'KEY-KCR-Q1P',
    barcode: '742712893012',
    description: '75% layout custom mechanical keyboard, fully aluminum body, hot-swappable switches.',
    costPrice: 18000,
    sellingPrice: 23500,
    quantity: 3,
    reorderLevel: 6,
    unit: 'pcs',
    isPublic: true,
    imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=60',
  },
];

const seedAllData = async () => {
  try {
    const isCLI = require.main === module;
    if (isCLI) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stockline_db');
      console.log('Connected to MongoDB for seeding...');
    }

    // Clean existing data
    await User.deleteMany();
    await Category.deleteMany();
    await Supplier.deleteMany();
    await Customer.deleteMany();
    await Product.deleteMany();
    await Purchase.deleteMany();
    await Sale.deleteMany();
    await StockMovement.deleteMany();
    await Order.deleteMany();
    await Setting.deleteMany();

    console.log('Cleared existing collections.');

    // Seed Users
    const users = [];
    for (const u of seedUsers) {
      const createdUser = await User.create(u);
      users.push(createdUser);
    }
    console.log(`✔ Seeded ${users.length} users.`);

    // Seed Categories
    const categories = await Category.insertMany(seedCategories);
    console.log(`✔ Seeded ${categories.length} categories.`);

    // Seed Suppliers
    const suppliers = await Supplier.insertMany(seedSuppliers);
    console.log(`✔ Seeded ${suppliers.length} suppliers.`);

    // Seed Customers
    const customers = await Customer.insertMany(seedCustomers);
    console.log(`✔ Seeded ${customers.length} customers.`);

    // Seed Products linked to categories and suppliers
    const products = [];
    for (let i = 0; i < seedProducts.length; i++) {
      const prod = seedProducts[i];
      const categoryId = categories[i % categories.length]._id;
      const supplierId = suppliers[i % suppliers.length]._id;
      const created = await Product.create({
        ...prod,
        categoryId,
        supplierId,
      });
      products.push(created);

      // Log initial movement
      await StockMovement.create({
        productId: created._id,
        type: 'purchase_in',
        quantity: created.quantity,
        balanceAfter: created.quantity,
        reference: 'INITIAL_SEED',
        reason: 'Initial demo inventory load',
        performedBy: 'System Seeder',
      });
    }
    console.log(`✔ Seeded ${products.length} products with initial stock movements.`);

    // Seed Setting
    await Setting.create({
      companyName: 'StockLine Commerce Ltd.',
      companyEmail: 'support@stockline.io',
      companyPhone: '+880 1711 000000',
      companyAddress: 'House 42, Road 11, Banani, Dhaka-1213, Bangladesh',
      currency: 'BDT',
      currencySymbol: '৳',
      taxRate: 5,
      defaultReorderThreshold: 10,
      theme: 'light',
    });
    console.log('✔ Seeded system settings.');

    console.log('\x1b[32m✔ Database seeding completed successfully!\x1b[0m');

    if (isCLI) {
      process.exit(0);
    }
    return true;
  } catch (error) {
    console.error('Seeding error:', error);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
};

const destroyData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/stockline_db');
    await User.deleteMany();
    await Category.deleteMany();
    await Supplier.deleteMany();
    await Customer.deleteMany();
    await Product.deleteMany();
    await Purchase.deleteMany();
    await Sale.deleteMany();
    await StockMovement.deleteMany();
    await Order.deleteMany();
    await Setting.deleteMany();
    console.log('\x1b[31mData destroyed successfully!\x1b[0m');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

if (require.main === module) {
  if (process.argv[2] === '-d') {
    destroyData();
  } else {
    seedAllData();
  }
}

module.exports = { seedAllData, destroyData };
