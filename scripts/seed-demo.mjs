// Populates realistic demo data (officers, products, customers, agreements, installments,
// receipts) on top of the committed supabase/seed.sql (categories + message templates).
// Run after `npx supabase db reset`:
//   node scripts/seed-demo.mjs
//
// This is dev-only seed data for exercising the UI locally — it is not part of the
// authoritative supabase/seed.sql (which stays scoped to categories + templates per README).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2].trim();
    }
  } catch {
    // fine if .env.local doesn't exist — assume env vars are already set
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

function monthsAgo(n, day = 1) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d.toISOString().slice(0, 10);
}
function firstOfMonth(n) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

async function createUser(email, fullName, role, cell, zone) {
  const { data: existing } = await admin.auth.admin.listUsers({ perPage: 200 });
  const already = existing?.users.find((u) => u.email === email);
  let userId = already?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "password123",
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }
  const { error: profErr } = await admin
    .from("profiles")
    .upsert({ id: userId, full_name: fullName, role, cell, zone, active: true });
  if (profErr) throw profErr;
  return userId;
}

async function main() {
  console.log("Creating team logins (password: password123)...");
  const owner = await createUser("owner@khalilelectronics.test", "Khalil Ahmad", "owner", "0300-1000001", null);
  const manager = await createUser("manager@khalilelectronics.test", "Kashif Nawaz", "manager", "0321-3344556", null);
  const accountant = await createUser("accounts@khalilelectronics.test", "Imran Shah", "accountant", "0300-7788112", null);
  const sales = await createUser("sales@khalilelectronics.test", "Sohail Ahmad", "sales", "0333-1122998", null);

  const officerDefs = [
    ["avo1@khalilelectronics.test", "Israr Ali", "Tehkal / University Rd"],
    ["avo2@khalilelectronics.test", "Naveed Khan", "Hayatabad / Pishtakhara"],
    ["avo3@khalilelectronics.test", "Waqar Shah", "Charsadda Rd / Malak Sajjad"],
    ["avo4@khalilelectronics.test", "Rehan Gul", "Kohat Rd / Gulbahar"],
  ];
  const officers = {};
  for (const [email, name, zone] of officerDefs) {
    officers[name] = await createUser(email, name, "avo", "030" + Math.floor(Math.random() * 10 ** 7), zone);
  }
  console.log("Officers ready:", Object.keys(officers).join(", "));

  console.log("Seeding vendors + products...");
  const vendorNames = ["Rehman Mobile", "Khyber Home Appliance", "Al-Noor Traders", "Frontier Motors", "Arsalan A2Z Battery"];
  const vendorIds = {};
  for (const name of vendorNames) {
    const { data } = await admin.from("vendors").select("id").eq("name", name).maybeSingle();
    if (data) {
      vendorIds[name] = data.id;
      continue;
    }
    const { data: inserted, error } = await admin.from("vendors").insert({ name, cell: "0300-0000000" }).select("id").single();
    if (error) throw error;
    vendorIds[name] = inserted.id;
  }

  const productDefs = [
    ["Samsung Galaxy S24", "Rehman Mobile", 210000, 248000, 4],
    ["Redmi Note 50", "Rehman Mobile", 42000, 52000, 11],
    ["Infinix Note 8", "Rehman Mobile", 25000, 35000, 7],
    ["Haier 12 cft fridge", "Khyber Home Appliance", 96000, 120600, 3],
    ["Dawlance 1.5 ton AC", "Khyber Home Appliance", 148000, 178000, 1],
    ['Ecostar LED 55"', "Al-Noor Traders", 82000, 99000, 5],
    ["Honda CD 70", "Frontier Motors", 74000, 88200, 2],
    ["AGS battery 27 plate", "Arsalan A2Z Battery", 21000, 26000, 9],
  ];
  const productIds = {};
  for (const [name, vendor, cost, price, stock] of productDefs) {
    const { data } = await admin.from("products").select("id").eq("name", name).maybeSingle();
    if (data) {
      productIds[name] = data.id;
      continue;
    }
    const { data: inserted, error } = await admin
      .from("products")
      .insert({ name, vendor_id: vendorIds[vendor], cost, price, stock, min_stock: 2 })
      .select("id")
      .single();
    if (error) throw error;
    productIds[name] = inserted.id;
  }

  // name, cnic, cell, area, g1, g1c, g2, g2c, avo, product, price, advance, plan, monthsOpen, paidMonths, lastPartial
  const customerDefs = [
    ["Adil Khan", "17301-4455778-1", "0311-4544577", "Tehkal Payan", "Asad Khan", "0312-4440014", "Wasif Khan", "0325-4447852", "Israr Ali", "Samsung Galaxy S24", 85000, 7500, 12, 2, 2, null],
    ["M. Hamza", "17101-8890021-5", "0311-3708178", "Kohat Road", "Alam Zeb", "0316-9546112", "Jan Mir", "0251-8489701", "Israr Ali", "Redmi Note 50", 35000, 2614, 12, 1, 1, null],
    ["Fawad Khalil", "17301-1122334-9", "0303-8974008", "University Road", "Zia-ul-Haq", "0332-9601203", "Jan Mir", "0251-8489701", "Naveed Khan", "Haier 12 cft fridge", 120600, 10050, 12, 1, 0, null],
    ["Zia-ul-Haq", "17201-5566778-3", "0332-9601203", "Hayatabad", "Badal Masih", "0315-9345412", "Haroon", "0328-1901005", "Naveed Khan", "Dawlance 1.5 ton AC", 63600, 5400, 10, 3, 1, null],
    ["Shahpur Khan", "17301-9081726-4", "0315-8585670", "Kamranullah Colony", "Kamranullah", "0313-9970031", "Asmat Ullah", "0315-8585670", "Waqar Shah", 'Ecostar LED 55"', 40800, 4000, 10, 3, 1, null],
    ["Dawat Ullah", "17101-3344556-7", "0319-6339293", "Malak Sajjad Town", "Nadeem", "0333-9223071", "Imran", "0346-8889983", "Waqar Shah", "Honda CD 70", 88200, 7350, 12, 1, 1, null],
    ["Tariq Khan", "17301-7788990-2", "0309-9746024", "Faqirabad", "Saifullah", "0315-9945590", "Hammad", "0319-9412275", "Israr Ali", "AGS battery 27 plate", 42000, 3500, 12, 1, 0, null],
    ["Sajjad ur Rehman", "17201-2233445-8", "0342-9120212", "Gulbahar", "Zeeshan", "0312-9808066", "Saeed Ahmad", "0311-9400706", "Rehan Gul", "Infinix Note 8", 37800, 3150, 12, 3, 0, null],
    ["Adnan Masih", "17301-6677889-1", "0311-0193586", "Kohat Road", "Raheem", "0314-9714513", "Razi Ullah", "0315-0617488", "Rehan Gul", "Redmi Note 50", 72000, 7100, 10, 2, 2, null],
    ["Aftab Jehan", "17301-1231234-0", "0346-9808332", "Charsadda Road", "Shabir ul Haq", "0346-9030490", "Qaiser", "0349-9139213", "Waqar Shah", "Samsung Galaxy S24", 196800, 16400, 12, 2, 1, null],
  ];

  console.log("Seeding customers, guarantors and agreements...");
  for (const row of customerDefs) {
    const [name, cnic, cell, area, g1, g1c, g2, g2c, avoName, productName, price, advance, plan, monthsOpen, paidMonths] = row;

    let { data: customer } = await admin.from("customers").select("id").eq("cnic", cnic).maybeSingle();
    if (!customer) {
      const { data: inserted, error } = await admin
        .from("customers")
        .insert({ full_name: name, cnic, cell, area, avo_id: officers[avoName], created_by: owner })
        .select("id")
        .single();
      if (error) throw error;
      customer = inserted;
      await admin.from("guarantors").insert([
        { customer_id: customer.id, slot: 1, full_name: g1, cell: g1c },
        { customer_id: customer.id, slot: 2, full_name: g2, cell: g2c },
      ]);
    }

    const { data: existingAgreement } = await admin
      .from("agreements")
      .select("id")
      .eq("customer_id", customer.id)
      .maybeSingle();
    if (existingAgreement) continue;

    const monthly = Math.round(price / plan);
    const openedOn = monthsAgo(monthsOpen);
    const { data: agreement, error: agErr } = await admin
      .from("agreements")
      .insert({
        customer_id: customer.id,
        sale_type: "installment",
        plan_months: plan,
        total_price: price,
        advance,
        monthly,
        opened_on: openedOn,
        first_due: firstOfMonth(-(monthsOpen - 1)),
        status: "open",
        sales_officer_id: sales,
      })
      .select("id")
      .single();
    if (agErr) throw agErr;

    await admin.from("agreement_items").insert({
      agreement_id: agreement.id,
      product_id: productIds[productName],
      qty: 1,
      unit_price: price,
    });

    const rows = [];
    rows.push({ agreement_id: agreement.id, seq: 1, due_month: openedOn, due_amount: monthly, paid: monthly, status: "paid" });
    for (let i = 2; i <= plan; i++) {
      const dueMonth = firstOfMonth(-(monthsOpen - 1) + (i - 2));
      const amount = i === plan ? price - monthly * (plan - 1) : monthly;
      const isPastOrCurrent = i - 1 <= paidMonths + 1; // seq2 is the 1st real installment
      const isPaid = i - 1 <= paidMonths;
      rows.push({
        agreement_id: agreement.id,
        seq: i,
        due_month: dueMonth,
        due_amount: amount,
        paid: isPaid ? amount : 0,
        status: isPaid ? "paid" : isPastOrCurrent ? "due" : "upcoming",
      });
    }
    const { error: instErr } = await admin.from("installments").insert(rows);
    if (instErr) throw instErr;
  }

  console.log("Posting a few receipts for today (Receipts today / officer recovery panels)...");
  const { data: dueCustomers } = await admin
    .from("customer_month_status")
    .select("customer_id, full_name, due_now, avo_id")
    .gt("due_now", 0)
    .limit(3);

  for (const c of dueCustomers ?? []) {
    const { data: agreement } = await admin.from("agreements").select("id").eq("customer_id", c.customer_id).single();
    if (!agreement) continue;
    const { error } = await admin.rpc("post_receipt", {
      p_agreement: agreement.id,
      p_amount: Math.round((c.due_now ?? 0) * 0.5) || 1000,
      p_mode: "cash",
      p_account: "cash_in_hand",
    });
    if (error) console.warn("post_receipt warning for", c.full_name, error.message);
  }

  console.log("\nDemo data ready. Sign in at /login with any of:");
  console.log("  owner@khalilelectronics.test / password123 (owner)");
  console.log("  manager@khalilelectronics.test / password123 (manager)");
  console.log("  accounts@khalilelectronics.test / password123 (accountant)");
  console.log("  sales@khalilelectronics.test / password123 (sales)");
  console.log("  avo1@khalilelectronics.test / password123 (AVO — Israr Ali, redirects to /avo)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
