# Handoff: Khalil Electronics installment & recovery system

## Overview
This is an office and field system for an electronics shop that sells mobiles, fridges, ACs, LEDs, bikes and batteries. Sales are either direct or on 10 or 12 month installment plans. The system covers:

- customers and two guarantors
- AVO (Account Verification Officer) house verification
- agreements with multiple products, including repeat purchases in later months
- monthly collection with shortfall carry-forward
- officer assignment and a mobile field app
- WhatsApp and SMS reminders
- products, vendors and purchases
- expenses and employees
- reports

**Target stack:** Next.js 15 (App Router, TypeScript, Server Actions), Supabase (Postgres, Auth, RLS, Storage, Edge Functions, Cron), Tailwind and shadcn/ui, deployed on Vercel.

## About the design files
`design/Owner Dashboard.dc.html` is a **design reference built in HTML**. It is a working prototype that shows the intended look and behaviour. It is not production code. Open it in a browser to click through every screen. Rebuild it in Next.js using the patterns below. Do not port the HTML directly.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii and interactions are final. Recreate them closely with Tailwind.

---

## Business rules (implement exactly)

1. **Monthly installment** = `total_price / plan_months`, rounded. The last installment absorbs the rounding difference so the sum equals the total.
2. **At signing**, the customer pays the **advance plus installment 1**. On a 12 month plan, 11 installments remain. They are due on the **1st of each following month**.
3. **Collection window** is the 1st to the 5th. After the 5th, an unpaid installment becomes **overdue**.
4. **Carry-forward**: if the customer pays less than what is owed, the shortfall is added to the next installment's `carry_in`. Example: Rs 10,000 paid against Rs 10,050 moves Rs 50 forward. An overpayment becomes a negative carry, which reduces the next installment.
5. **Multiple purchases**: each sale is its own agreement. A customer who buys in August and again in September has two agreements. Office and field views show **one combined monthly due per customer** (the sum across open agreements). The ledger lists each agreement separately.
6. **Agreement lifecycle**: `pending_verification` → (AVO approves the house visit) → `open` → (all installments paid) → `closed`. A direct sale is created as `closed`.
7. **Status per customer per month:**
   - `paid`: nothing owed
   - `short`: a carry exists
   - `due`: unpaid, inside the window
   - `overdue`: past the 5th, or one month behind
   - `default`: two or more months behind. Flag the guarantors for contact.

All of this is in `supabase/migrations/0002_billing.sql`:
- `create_agreement`
- `post_receipt`
- `approve_verification`
- the `customer_month_status` view

Always call these through `supabase.rpc()`. Never compute balances on the client.

## Roles
| Role | Access |
|---|---|
| owner | everything |
| manager | everything except payroll edits |
| accountant | receipts, expenses, vendors, payments, reports |
| sales | customers, agreements, products (read) |
| avo | field app only: their assigned customers, post receipts, verifications |

These are enforced with RLS in `0003_rls.sql`. Next.js middleware sends AVO users to `/avo`.

## Suggested project structure
```
app/
  (auth)/login
  (office)/layout.tsx          sidebar + top bar shell
  (office)/dashboard
  (office)/customers           + [id] ledger
  (office)/agreements/new
  (office)/receipts
  (office)/recovery            officers, assignment, verifications
  (office)/products
  (office)/vendors             + purchases/new, payments
  (office)/expenses
  (office)/employees
  (office)/reports/[report]
  (field)/avo                  PWA: my customers, collect, verify
components/ ui/ (shadcn), app-sidebar, kpi-card, data-table, status-chip, collect-dialog
lib/ supabase/{server,client}.ts, money.ts, whatsapp.ts
supabase/ migrations/, seed.sql, functions/send-messages, functions/daily-cron
```

## Screens

### App shell (all office screens)
- The page background is `#f3f4f6` with 14px padding and a 14px gap. Three floating white panels: sidebar, top bar and content. Each has radius 22px and shadow `0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.05)`.
- The page itself never scrolls (`h-screen overflow-hidden`). Only the content column scrolls.
- **Sidebar** is 228px wide and collapses to a 76px icon rail with the hamburger.
  - Logo: 34px rounded square in `#16814a` with a white bolt icon, plus the shop name (17px/800).
  - Two groups, labelled MENU and GENERAL (10.5px/700, tracking .12em, `#98a2b3`).
    - MENU: Dashboard, Customers, New agreement, Receipts, AVO & recovery
    - GENERAL: Products, Vendors & bills, Expenses, Employees, Reports
  - Items: 13.5px/600, padding 10×12, radius 12. Active item: background `#eaf6ef`, text `#0c4a2c`, icon `#1f9d57`.
  - Count badges are pills. The AVO & recovery badge turns red (`#fdecea`/`#b42318`) when accounts are behind.
  - At the bottom, a dark green card (`#0c4a2c`) reads "Field app" with an "Open" button (`#1f9d57`).
- **Top bar**, left to right:
  - hamburger
  - search pill (`#f7f8fa`) with a ⌘F hint
  - collection-window pill (`#eaf6ef` / `#0f6b3c`)
  - Office/Field segmented switch (active `#101828` on white text)
  - message centre icon
  - avatar with name and role
  - Below 1240px the window pill and ⌘F hide. Below 1080px the name/role text hides.
- **Page header**: title 26px/800, letter-spacing −.6px. The subtitle is a short data line (12.5px, `#98a2b3`), e.g. "Sep 2026 · 9 open · 3 behind". On the right: a month switcher (pill group) and a primary button (`#16814a`, white, with icon, shadow `0 6px 16px rgba(15,107,60,.22)`).

### Dashboard
- **KPI row**: four tiles in a grid (two columns below 1040px).
  - Tile 1 is the hero tile: background `#0c4a2c`, white text.
  - Tiles: Due this month, Collected today, Outstanding, Behind.
  - Each tile has an icon, a 13px/700 label, a corner arrow button, a 31px/800 value (tabular numbers) and an 11.5px note.
- **Two columns**, 1.65fr and 1fr (stacked below 1180px).
  - **Dues to recover** table:
    - Filter pills: All, Attention, Due, Paid
    - A colour legend strip
    - Columns: Customer (4px status bar, name 14/700, meta 11.5), Status chip with icon, Due now (right-aligned, with "Rs X left" underneath), Action ("Collect" primary pill and a WhatsApp icon button)
    - Rows are 13px tall with a `#eceef2` divider and hover `#f7f8fa`
  - **Officer recovery**: one row per AVO with initials avatar, name, %, a 7px progress bar (green ≥60%, amber ≥25%, orange below that), and amounts plus account counts.
  - **Receipts today**: list with avatar, name, officer/mode/time and amount.

### Customers (monthly register)
- Four stat tiles. Status tabs: All, Needs attention, Due, Short paid, Overdue, Defaulter, Paid (each with a count). An officer filter dropdown.
- Columns: Customer (name, acc and cell), Guarantors (G1 / G2 names, cells), Plan (e.g. "12 mo", "7/12 paid"), Monthly (price below), Due now (carry note below; red if overdue or default), Status chip, Action (Collect or Ledger).
- Use one shared `<DataTable>` with a CSS grid template per screen. Each table has a `min-width` and scrolls horizontally inside its card so columns never collapse.

### New agreement
- Cards: Customer (name, cell, CNIC, address), Guarantor 1, Guarantor 2, Products (multi-line items and sale price), Payment terms (segmented 10 month / 12 month / Direct, sale price, advance).
- Inputs: radius 12, background `#f7f8fa`, border `#eceef2`.
- A dark green summary bar shows the live calculation: Monthly installment, Collect today (advance + month 1), Months remaining, Balance. Save button `#1f9d57`.
- Save calls `create_agreement`, then creates a `verifications` row assigned to the area's AVO.

### Receipts, AVO & recovery, Products, Vendors & bills, Expenses, Employees
These all use the same layout: four stat tiles plus a DataTable. The exact columns are in `screenData()` in the prototype's logic class.

AVO & recovery also needs:
- an **Assign** flow: multi-select customers, choose an AVO, then `update customers set avo_id`
- a **verification queue**

### Reports
Grid of tiles with icon, group, name and description:
- Installments received
- Installments receivable
- Daily recovery sheet
- Defaulter list
- Customer ledger
- Account payables
- Inventory & reorder
- Profit & loss

Each tile opens `/reports/[key]` with the month filter and offers print/PDF.

### Collect dialog (shared by office and field)
- 452px, radius 24.
- Shows the customer name, acc, plan and AVO, then two tiles: Monthly and Due now.
- An amount input with quick-fill pills: Full, Monthly only, Half.
- A live hint that changes colour with the amount:
  - short: amber `#fdf3e3` / `#8a5a10`, "Rs 50 short → carries to next month"
  - extra: green, "→ reduces next month"
  - exact: neutral
- "Post receipt" calls `post_receipt`, shows a toast, and refreshes the data with `revalidatePath`.

### AVO field app (`/avo`, PWA)
- Single column, max width 420px.
- Dark green header: officer, month, collected and outstanding.
- Search box, then customer cards (status bar, name, chip, acc/cell/area, Due now / Remaining, a full-width Collect button and a WhatsApp button).
- The officer only sees their assigned customers (enforced by RLS).
- Capture GPS on each receipt.
- Offline queue: store receipts in IndexedDB and sync when back online.
- A Verify tab lists pending house visits: photo upload to the Storage bucket `verifications`, house type, notes, Approve or Reject.

## Messaging
- `supabase/functions/send-messages` drains the `messages` table where `status='queued'`.
  - WhatsApp goes through the Meta WhatsApp Cloud API. Use approved templates: reminder, received, overdue, closed.
  - SMS goes through a local gateway.
- **Cron** (`pg_cron` or Supabase scheduled functions):
  - on the 28th, queue a `reminder` for every customer with an installment due next month
  - on the 6th, queue `overdue` for unpaid accounts
  - daily, mark statuses
- A trigger on `receipts` already queues the `received` message.
- "Send month reminders" on the dashboard queues reminders manually.

## Design tokens
| Token | Value |
|---|---|
| page | `#f3f4f6` |
| panel | `#ffffff` |
| ink / ink2 / ink3 | `#101828` / `#475467` / `#98a2b3` |
| line / soft | `#eceef2` / `#f7f8fa` |
| green 50/100/300/500/600/700/900 | `#eaf6ef` `#d6ecdf` `#6fbf8f` `#1f9d57` `#16814a` `#0f6b3c` `#0c4a2c` |
| amber / amber50 | `#d98a1a` / `#fdf3e3` |
| overdue | `#e0761f` |
| red / red50 | `#b42318` / `#fdecea` |
| radius | panels 22, cards 14–18, inputs 12, buttons and chips pill |
| font | Plus Jakarta Sans 400–800. Numbers use `tabular-nums`. |
| type scale | 26 page title · 31 KPI · 16.5 card title · 14 row name · 13 body · 11.5 meta · 10.5 labels (uppercase .08em) |

Status colours (bar / chip background / chip text):
- paid: `#1f9d57` / `#eaf6ef` / `#0f6b3c`
- short: `#d98a1a` / `#fdf3e3` / `#8a5a10`
- due: `#cbd2dc` / `#f7f8fa` / `#475467`
- overdue: `#e0761f` / `#fdf3e3` / `#9a4a08`
- default: `#b42318` / `#fdecea` / `#b42318`

## Assets
- Icons are hand-drawn Lucide-style strokes in the prototype. Use `lucide-react` instead, with stroke width 2.4: LayoutGrid, Users, FileText, Receipt, MapPin, Box, Truck, Wallet, UserCheck, BarChart3, Calendar, CheckCircle, AlertCircle, AlertTriangle, BookOpen, Send, MessageCircle, Banknote, TrendingUp, Plus, RefreshCw, ArrowUpRight, Menu, Search, Mail, Clock, Zap, ShieldCheck, Home.
- There are no images.

## Files
- `design/Owner Dashboard.dc.html`: the prototype. Open it in a browser, with `support.js` alongside it.
- `supabase/migrations/0001_schema.sql`: tables and enums
- `supabase/migrations/0002_billing.sql`: agreement, receipt and carry-forward logic, the status view, triggers
- `supabase/migrations/0003_rls.sql`: role policies
- `supabase/seed.sql`: categories and message templates

## Build order
1. Supabase project, migrations, seed, auth and `profiles`
2. App shell and sidebar
3. Customers, guarantors and the customer ledger
4. Products, vendors and purchases
5. New agreement and verification queue
6. Collect dialog and receipts
7. Dashboard
8. AVO PWA
9. Messaging functions and cron
10. Expenses, employees and reports

## Prompt for Claude Code
> Read README.md and the SQL in /supabase. Scaffold a Next.js 15 + Supabase + Tailwind + shadcn project. Implement the app shell and Dashboard first, matching `design/Owner Dashboard.dc.html` exactly, using the `customer_month_status` view and the `post_receipt` RPC.
