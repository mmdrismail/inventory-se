/**
 * StockLine Enterprise Customer Data Auto-Healer & Synchronizer
 * Fills in missing customer profile fields (company name, role, address, location, email, phone)
 * by cross-referencing all historical quotations, sales invoices, and customer records.
 */
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // ignore
}

const path = require('path');
const dotenv = require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(__dirname, '..', 'server', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Customer = require(path.join(__dirname, '..', 'server', 'models', 'Customer'));
const Quotation = require(path.join(__dirname, '..', 'server', 'models', 'Quotation'));
const Sale = require(path.join(__dirname, '..', 'server', 'models', 'Sale'));

async function heal() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB Connected for Customer Auto-Healing');

  const custs = await Customer.find({});
  const quotes = await Quotation.find({});
  const sales = await Sale.find({});

  let updatedCount = 0;

  for (const c of custs) {
    const cName = (c.name || '').toLowerCase().trim();
    const cPhone = (c.phone || '').trim();

    const matchQ = quotes.find((q) => {
      const qCustId = q.customerId ? String(q.customerId) : '';
      const qPhone = (q.customerPhone || '').trim();
      const qName = (q.customerName || '').toLowerCase().trim();
      return (
        (qCustId && qCustId === String(c._id)) ||
        (qPhone && cPhone && qPhone === cPhone) ||
        (qName && cName && qName === cName)
      );
    });

    const matchS = sales.find((s) => {
      const sCustId = s.customerId ? String(s.customerId) : '';
      const sPhone = (s.customerPhone || '').trim();
      const sName = (s.customerName || '').toLowerCase().trim();
      return (
        (sCustId && sCustId === String(c._id)) ||
        (sPhone && cPhone && sPhone === cPhone) ||
        (sName && cName && sName === cName)
      );
    });

    const updates = {};

    const foundCompany = matchQ?.customerCompany || matchS?.customerCompany;
    if (!c.companyName && foundCompany) {
      updates.companyName = foundCompany;
    }

    const foundRole = matchQ?.customerRole || matchS?.customerRole;
    if ((!c.designationRole || c.designationRole === 'owner') && foundRole && foundRole !== 'owner') {
      updates.designationRole = foundRole;
    }

    const foundPhone = matchQ?.customerPhone || matchS?.customerPhone;
    if (!c.phone && foundPhone) {
      updates.phone = foundPhone;
    }

    const foundAddress = matchQ?.customerAddress || matchS?.customerAddress;
    if (!c.address && foundAddress) {
      updates.address = foundAddress;
    }

    const foundLocation = matchQ?.customerLocation || matchS?.customerLocation || updates.address || c.address;
    if (!c.location && foundLocation) {
      updates.location = foundLocation;
    }

    const foundEmail = matchQ?.customerEmail || matchS?.customerEmail;
    if (!c.email && foundEmail) {
      updates.email = foundEmail;
    }

    if (Object.keys(updates).length > 0) {
      await Customer.updateOne({ _id: c._id }, { $set: updates });
      console.log(`[Healed Customer] ${c.name}:`, updates);
      updatedCount++;
    }
  }

  console.log(`Total healed customers: ${updatedCount}`);
  process.exit(0);
}

heal().catch((err) => {
  console.error('Heal error:', err);
  process.exit(1);
});
