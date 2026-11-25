const DB_STORAGE_KEY = "glirabharat_enterprise_db_v3";
const THEME_STORAGE_KEY = "glirabharat_theme_v3";
const PAGE_SIZE = 12;

let db = {
  products: [],
  customers: [],
  leads: [],
  invoices: [],
  campaigns: [],
  ecomOrders: []
};

let cart = [];
let activeModule = "dashboard";
let searchQuery = "";
let leadSubView = "table";
let storeSubTab = "catalog";

let filters = {
  crmSegment: "ALL",
  leadStage: "ALL",
  billingStatus: "ALL",
  inventoryCat: "ALL",
  marketingStatus: "ALL",
  storeCat: "ALL"
};

let pages = {
  customers: 1,
  leads: 1,
  invoices: 1,
  products: 1,
  campaigns: 1
};

const MODULE_META = {
  dashboard: { title: "Executive Dashboard", sub: "Real-time company revenue, pipeline velocity, inventory health & storefront telemetry.", actionLabel: "+ New Invoice", actionType: "invoice" },
  crm: { title: "CRM & Customer Directory", sub: "Manage B2B & D2C customer accounts, lifetime value, and account health.", actionLabel: "+ Add Customer", actionType: "customer" },
  leads: { title: "Leads & Sales Pipeline", sub: "Track incoming prospects, lead scoring, and deal stage conversions.", actionLabel: "+ New Lead", actionType: "lead" },
  billing: { title: "Billing & GST Invoicing", sub: "Generate tax invoices, track collections, and monitor overdue balances.", actionLabel: "+ Create Invoice", actionType: "invoice" },
  inventory: { title: "Products & Inventory", sub: "Control SKUs, stock levels, warehouse locations, and reorder thresholds.", actionLabel: "+ Add Product", actionType: "product" },
  marketing: { title: "Marketing & Growth Studio", sub: "Measure multi-channel campaign spend, CTR, conversions, and ROAS.", actionLabel: "+ Launch Campaign", actionType: "campaign" },
  storefront: { title: "E-Commerce Storefront", sub: "Live D2C catalog & order management integrated directly with inventory.", actionLabel: "🛒 View Cart", actionType: "cart" }
};

const CAT_ICONS = {
  "Electronics": "🎧",
  "Office Supplies": "🪑",
  "Organic Foods": "🫙",
  "Apparel": "👔",
  "Home & Kitchen": "☕",
  "Fitness Gear": "🏋️"
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  loadDatabase();
  bindEvents();
  updateBadges();
  renderCurrentModule();
});

function loadDatabase() {
  const raw = localStorage.getItem(DB_STORAGE_KEY);
  if (raw) {
    try {
      db = JSON.parse(raw);
      return;
    } catch (e) {
      console.warn("Resetting corrupt local DB", e);
    }
  }
  db = JSON.parse(JSON.stringify(window.GLIRABHARAT_SEED_DATA));
  saveDatabase();
}

function saveDatabase() {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
  updateBadges();
}

function initTheme() {
  if (localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
    document.body.classList.add("dark");
  }
}

function bindEvents() {
  // Desktop & Mobile Navigation
  document.querySelectorAll(".nav-btn, .mob-nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchModule(btn.dataset.module));
  });

  // Global Search
  document.getElementById("globalSearchInput").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    Object.keys(pages).forEach(k => pages[k] = 1);
    renderCurrentModule();
  });

  // Theme Toggle
  document.getElementById("themeToggleBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(THEME_STORAGE_KEY, document.body.classList.contains("dark") ? "dark" : "light");
  });

  // Topbar Primary Action
  document.getElementById("primaryActionBtn").addEventListener("click", () => {
    const meta = MODULE_META[activeModule];
    if (meta.actionType === "cart") openCartDrawer();
    else openEntityModal(meta.actionType);
  });

  // Cart & Mobile Drawer
  document.getElementById("openStoreCartBtn").addEventListener("click", openCartDrawer);
  document.getElementById("mobileMoreBtn").addEventListener("click", () => {
    document.getElementById("mobileDrawer").classList.remove("hidden");
  });

  // Filter Pills Setup
  setupPillGroup("crmSegmentFilters", "crmSegment", "customers");
  setupPillGroup("billingStatusFilters", "billingStatus", "invoices");
  setupPillGroup("inventoryCatFilters", "inventoryCat", "products");
  setupPillGroup("marketingStatusFilters", "marketingStatus", "campaigns");
  setupPillGroup("storeCatFilters", "storeCat", null);

  document.getElementById("leadStageFilter").addEventListener("change", (e) => {
    filters.leadStage = e.target.value;
    pages.leads = 1;
    renderLeads();
  });

  // Backup & Reset
  document.getElementById("exportAllBtn").addEventListener("click", exportAllData);
  document.getElementById("resetAllBtn").addEventListener("click", () => {
    if (!confirm("Restore all 390+ default enterprise sample records?")) return;
    db = JSON.parse(JSON.stringify(window.GLIRABHARAT_SEED_DATA));
    saveDatabase();
    renderCurrentModule();
    showToast("Database restored to default sample dataset.");
  });
}

function setupPillGroup(containerId, filterKey, pageKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll(".pill").forEach(pill => {
    pill.addEventListener("click", () => {
      container.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      filters[filterKey] = pill.dataset.filter;
      if (pageKey) pages[pageKey] = 1;
      renderCurrentModule();
    });
  });
}

window.switchModule = function(mod) {
  activeModule = mod;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.module === mod));
  document.querySelectorAll(".mob-nav-item").forEach(b => b.classList.toggle("active", b.dataset.module === mod));
  document.querySelectorAll(".module-view").forEach(v => v.classList.remove("active"));
  document.getElementById(`mod-${mod}`).classList.add("active");

  const meta = MODULE_META[mod];
  document.getElementById("moduleTitle").textContent = meta.title;
  document.getElementById("moduleSubtitle").textContent = meta.sub;
  document.getElementById("primaryActionBtn").textContent = meta.actionLabel;

  renderCurrentModule();
};

function updateBadges() {
  document.getElementById("badge-crm").textContent = db.customers.length;
  document.getElementById("badge-leads").textContent = db.leads.length;
  document.getElementById("badge-billing").textContent = db.invoices.length;
  document.getElementById("badge-inventory").textContent = db.products.length;
  document.getElementById("badge-marketing").textContent = db.campaigns.length;
  document.getElementById("ecomOrdersCount").textContent = db.ecomOrders.length;

  const cartQty = cart.reduce((sum, i) => sum + i.qty, 0);
  document.getElementById("badge-cart").textContent = cartQty;
  document.getElementById("topCartCount").textContent = cartQty;
  document.getElementById("heroCartCount").textContent = cartQty;
}

function renderCurrentModule() {
  switch (activeModule) {
    case "dashboard": renderDashboard(); break;
    case "crm": renderCRM(); break;
    case "leads": renderLeads(); break;
    case "billing": renderBilling(); break;
    case "inventory": renderInventory(); break;
    case "marketing": renderMarketing(); break;
    case "storefront": renderStorefront(); break;
  }
}

/* ==================== 1. EXECUTIVE DASHBOARD ==================== */
function renderDashboard() {
  const paidRev = db.invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.total, 0);
  const pipelineVal = db.leads.filter(l => l.stage !== "Lost").reduce((s, l) => s + l.value, 0);
  const lowStockCount = db.products.filter(p => p.stock <= p.reorderLevel).length;
  const totalAdRev = db.campaigns.reduce((s, c) => s + c.revenue, 0);
  const totalAdSpend = db.campaigns.reduce((s, c) => s + c.spend, 0) || 1;
  const avgRoas = (totalAdRev / totalAdSpend).toFixed(2);

  document.getElementById("dashboardKpis").innerHTML = `
    <div class="kpi-card">
      <div class="kpi-top"><span class="kpi-label">Collected Revenue</span><span class="kpi-icon">💰</span></div>
      <div class="kpi-value">${formatINR(paidRev)}</div>
      <div class="kpi-sub"><span class="up">↑ 18.4%</span> across ${db.invoices.length} invoices</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-top"><span class="kpi-label">Active Sales Pipeline</span><span class="kpi-icon">🎯</span></div>
      <div class="kpi-value">${formatINR(pipelineVal)}</div>
      <div class="kpi-sub"><span class="up">${db.leads.length} leads</span> in CRM funnel</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-top"><span class="kpi-label">Inventory Health</span><span class="kpi-icon">📦</span></div>
      <div class="kpi-value">${db.products.length} SKUs</div>
      <div class="kpi-sub"><span class="warn">${lowStockCount} items</span> below reorder point</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-top"><span class="kpi-label">Marketing ROAS</span><span class="kpi-icon">📣</span></div>
      <div class="kpi-value">${avgRoas}x</div>
      <div class="kpi-sub"><span class="up">${formatINR(totalAdRev)}</span> attributed sales</div>
    </div>
  `;

  // Monthly Revenue Visual Bars
  const months = [
    { m: "Jun", val: 310000 },
    { m: "Jul", val: 385000 },
    { m: "Aug", val: 360000 },
    { m: "Sep", val: 445000 },
    { m: "Oct", val: 510000 },
    { m: "Nov", val: Math.max(paidRev, 420000) }
  ];
  const maxVal = Math.max(...months.map(x => x.val));
  document.getElementById("revenueBarChart").innerHTML = `
    <div class="bar-visual-grid">
      ${months.map(item => {
        const h = Math.round((item.val / maxVal) * 140);
        return `
          <div class="v-bar-col">
            <span class="v-bar-val">₹${Math.round(item.val / 1000)}k</span>
            <div class="v-bar-fill" style="height:${h}px"></div>
            <span class="v-bar-lbl">${item.m}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;

  // Funnel Chart
  const stages = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won"];
  const colors = ["#64748b", "#3b82f6", "#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981"];
  document.getElementById("funnelChart").innerHTML = stages.map((st, idx) => {
    const cnt = db.leads.filter(l => l.stage === st).length;
    const pct = Math.min(100, Math.round((cnt / (db.leads.length || 1)) * 320));
    return `
      <div class="funnel-row">
        <div class="funnel-meta"><span>${st}</span><span>${cnt} leads</span></div>
        <div class="funnel-track"><div class="funnel-fill" style="width:${pct}%; background:${colors[idx]};"></div></div>
      </div>
    `;
  }).join("");

  // Low Stock Table
  const lowItems = db.products.filter(p => p.stock <= p.reorderLevel).slice(0, 6);
  document.getElementById("dashLowStockBody").innerHTML = lowItems.map(p => `
    <tr>
      <td><strong>${p.sku}</strong></td>
      <td>${escapeHtml(p.name)}</td>
      <td><span class="status-badge ${p.stock === 0 ? 'st-red' : 'st-amber'}">${p.stock} left</span></td>
      <td><button class="btn btn-outline btn-xs" onclick="restockProduct('${p.id}')">+25 Restock</button></td>
    </tr>
  `).join("");

  // Recent Invoices Table
  document.getElementById("dashRecentInvoicesBody").innerHTML = db.invoices.slice(0, 6).map(inv => `
    <tr>
      <td><strong>${inv.id}</strong></td>
      <td>${escapeHtml(inv.customerName)}</td>
      <td>${formatINR(inv.total)}</td>
      <td>${renderStatusBadge(inv.status)}</td>
    </tr>
  `).join("");
}

/* ==================== 2. CRM & CUSTOMERS ==================== */
function renderCRM() {
  const filtered = db.customers.filter(c => {
    const matchSeg = filters.crmSegment === "ALL" || c.segment === filters.crmSegment;
    const matchQ = !searchQuery || c.name.toLowerCase().includes(searchQuery) || c.company.toLowerCase().includes(searchQuery) || c.city.toLowerCase().includes(searchQuery);
    return matchSeg && matchQ;
  });

  const { slice, totalPages } = paginate(filtered, pages.customers);
  document.getElementById("crmTableBody").innerHTML = slice.map(c => `
    <tr>
      <td><strong>${c.id}</strong></td>
      <td><div class="cell-main">${escapeHtml(c.name)}</div><div class="cell-sub">${escapeHtml(c.company)} • ${escapeHtml(c.email)}</div></td>
      <td>${escapeHtml(c.city)}</td>
      <td><span class="status-badge st-blue">${c.segment}</span></td>
      <td><strong>${formatINR(c.ltv)}</strong><div class="cell-sub">${c.ordersCount} orders</div></td>
      <td>${renderStatusBadge(c.status)}</td>
      <td>
        <button class="btn btn-ghost btn-xs" onclick="openEntityModal('customer', '${c.id}')">Edit</button>
        <button class="btn btn-ghost btn-xs" onclick="deleteRecord('customers', '${c.id}')">Delete</button>
      </td>
    </tr>
  `).join("");

  renderPagination("crmPagination", "customers", filtered.length, totalPages);
}

/* ==================== 3. LEADS & PIPELINE ==================== */
window.toggleLeadView = function(mode) {
  leadSubView = mode;
  document.getElementById("leadViewTableBtn").classList.toggle("active", mode === "table");
  document.getElementById("leadViewKanbanBtn").classList.toggle("active", mode === "kanban");
  document.getElementById("leadsTableContainer").classList.toggle("hidden", mode !== "table");
  document.getElementById("leadsKanbanContainer").classList.toggle("hidden", mode !== "kanban");
  renderLeads();
};

function renderLeads() {
  const filtered = db.leads.filter(l => {
    const matchStage = filters.leadStage === "ALL" || l.stage === filters.leadStage;
    const matchQ = !searchQuery || l.name.toLowerCase().includes(searchQuery) || l.company.toLowerCase().includes(searchQuery) || l.source.toLowerCase().includes(searchQuery);
    return matchStage && matchQ;
  });

  if (leadSubView === "table") {
    const { slice, totalPages } = paginate(filtered, pages.leads);
    document.getElementById("leadsTableBody").innerHTML = slice.map(l => `
      <tr>
        <td><strong>${l.id}</strong></td>
        <td><div class="cell-main">${escapeHtml(l.name)}</div><div class="cell-sub">${escapeHtml(l.company)}</div></td>
        <td>${escapeHtml(l.source)}</td>
        <td><span class="status-badge ${l.stage === 'Won' ? 'st-green' : l.stage === 'Lost' ? 'st-red' : 'st-blue'}">${l.stage}</span></td>
        <td><strong>${formatINR(l.value)}</strong></td>
        <td><strong>${l.score}/100</strong></td>
        <td>${escapeHtml(l.owner)}</td>
        <td>
          <button class="btn btn-outline btn-xs" onclick="convertLeadToCustomer('${l.id}')" title="Convert to Customer">Convert</button>
          <button class="btn btn-ghost btn-xs" onclick="openEntityModal('lead', '${l.id}')">Edit</button>
        </td>
      </tr>
    `).join("");
    renderPagination("leadsPagination", "leads", filtered.length, totalPages);
  } else {
    const stages = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won"];
    document.getElementById("leadsKanbanContainer").innerHTML = stages.map(st => {
      const items = filtered.filter(l => l.stage === st);
      return `
        <div class="lead-col">
          <div class="lead-col-head"><span>${st}</span><span>${items.length}</span></div>
          ${items.slice(0, 12).map(l => `
            <div class="lead-card-item">
              <div class="cell-main">${escapeHtml(l.name)}</div>
              <div class="cell-sub">${escapeHtml(l.company)}</div>
              <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:0.78rem;">
                <strong>${formatINR(l.value)}</strong>
                <button class="btn btn-ghost btn-xs" onclick="advanceLeadStage('${l.id}')">Advance →</button>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }).join("");
  }
}

window.advanceLeadStage = function(id) {
  const stages = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won"];
  const lead = db.leads.find(l => l.id === id);
  if (!lead) return;
  const idx = stages.indexOf(lead.stage);
  if (idx >= 0 && idx < stages.length - 1) {
    lead.stage = stages[idx + 1];
    saveDatabase();
    renderLeads();
    showToast(`Moved ${lead.name} to ${lead.stage}`);
  }
};

window.convertLeadToCustomer = function(id) {
  const lead = db.leads.find(l => l.id === id);
  if (!lead) return;
  lead.stage = "Won";
  db.customers.unshift({
    id: "CUST-" + (2001 + db.customers.length),
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    city: "Coimbatore",
    segment: "Enterprise",
    status: "Active",
    ltv: lead.value,
    ordersCount: 1,
    lastContact: "2026-11-25"
  });
  saveDatabase();
  renderLeads();
  showToast(`Converted ${lead.name} into an Active CRM Customer!`);
};

/* ==================== 4. BILLING & INVOICES ==================== */
function renderBilling() {
  const paid = db.invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.total, 0);
  const pending = db.invoices.filter(i => i.status === "Pending").reduce((s, i) => s + i.total, 0);
  const overdue = db.invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.total, 0);

  document.getElementById("billingKpis").innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Total Invoiced</div><div class="kpi-value">${formatINR(paid + pending + overdue)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Paid & Settled</div><div class="kpi-value" style="color:var(--success)">${formatINR(paid)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Pending Approval</div><div class="kpi-value" style="color:var(--warning)">${formatINR(pending)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Overdue Receivables</div><div class="kpi-value" style="color:var(--danger)">${formatINR(overdue)}</div></div>
  `;

  const filtered = db.invoices.filter(inv => {
    const matchSt = filters.billingStatus === "ALL" || inv.status === filters.billingStatus;
    const matchQ = !searchQuery || inv.id.toLowerCase().includes(searchQuery) || inv.customerName.toLowerCase().includes(searchQuery);
    return matchSt && matchQ;
  });

  const { slice, totalPages } = paginate(filtered, pages.invoices);
  document.getElementById("billingTableBody").innerHTML = slice.map(inv => `
    <tr>
      <td><strong>${inv.id}</strong></td>
      <td><div class="cell-main">${escapeHtml(inv.customerName)}</div><div class="cell-sub">${escapeHtml(inv.paymentMethod)}</div></td>
      <td><div>${inv.date}</div><div class="cell-sub">Due: ${inv.dueDate}</div></td>
      <td>${formatINR(inv.subtotal)}</td>
      <td>${formatINR(inv.tax)}</td>
      <td><strong>${formatINR(inv.total)}</strong></td>
      <td>${renderStatusBadge(inv.status)}</td>
      <td>
        <button class="btn btn-outline btn-xs" onclick="viewInvoice('${inv.id}')">View</button>
        ${inv.status !== 'Paid' ? `<button class="btn btn-ghost btn-xs" onclick="markInvoicePaid('${inv.id}')">Mark Paid</button>` : ''}
      </td>
    </tr>
  `).join("");

  renderPagination("billingPagination", "invoices", filtered.length, totalPages);
}

window.markInvoicePaid = function(id) {
  const inv = db.invoices.find(i => i.id === id);
  if (inv) {
    inv.status = "Paid";
    saveDatabase();
    renderBilling();
    showToast(`Invoice ${id} marked as Paid.`);
  }
};

window.viewInvoice = function(id) {
  const inv = db.invoices.find(i => i.id === id);
  if (!inv) return;
  document.getElementById("invoicePrintBody").innerHTML = `
    <div style="display:flex;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:14px;margin-bottom:16px;">
      <div>
        <h2 style="margin:0;">GLIRA BHARAT TECHNOLOGIES PVT LTD</h2>
        <p style="font-size:0.82rem;color:#475569;">GSTIN: 33AABCN4921M1Z5 • Coimbatore, Tamil Nadu</p>
      </div>
      <div style="text-align:right;">
        <h3 style="margin:0;color:#2563eb;">TAX INVOICE</h3>
        <p style="font-size:0.85rem;"><strong>${inv.id}</strong><br/>Date: ${inv.date}</p>
      </div>
    </div>
    <p style="margin-bottom:14px;"><strong>Billed To:</strong> ${escapeHtml(inv.customerName)} (${escapeHtml(inv.company || "Direct Client")})</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:0.88rem;">
      <thead><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;">Qty</th><th style="padding:8px;text-align:right;">Rate</th><th style="padding:8px;text-align:right;">Amount</th></tr></thead>
      <tbody>
        ${(inv.items || [{ name: "Enterprise Product Bundle", qty: 1, price: inv.subtotal }]).map(it => `
          <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px;">${escapeHtml(it.name)}</td>
            <td style="padding:8px;text-align:center;">${it.qty}</td>
            <td style="padding:8px;text-align:right;">${formatINR(it.price)}</td>
            <td style="padding:8px;text-align:right;">${formatINR(it.price * it.qty)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
    <div style="text-align:right;font-size:0.92rem;">
      <p>Subtotal: <strong>${formatINR(inv.subtotal)}</strong></p>
      <p>IGST / CGST+SGST (18%): <strong>${formatINR(inv.tax)}</strong></p>
      <h3 style="margin-top:6px;color:#0f172a;">Grand Total: ${formatINR(inv.total)} (${inv.status})</h3>
    </div>
  `;
  document.getElementById("invoiceViewModal").classList.remove("hidden");
};
window.closeInvoiceView = () => document.getElementById("invoiceViewModal").classList.add("hidden");

/* ==================== 5. PRODUCTS & INVENTORY ==================== */
function renderInventory() {
  const filtered = db.products.filter(p => {
    const matchCat = filters.inventoryCat === "ALL" || p.category === filters.inventoryCat;
    const matchQ = !searchQuery || p.name.toLowerCase().includes(searchQuery) || p.sku.toLowerCase().includes(searchQuery);
    return matchCat && matchQ;
  });

  const { slice, totalPages } = paginate(filtered, pages.products);
  document.getElementById("inventoryTableBody").innerHTML = slice.map(p => {
    const stockBadge = p.stock === 0 ? "st-red" : p.stock <= p.reorderLevel ? "st-amber" : "st-green";
    return `
      <tr>
        <td><strong>${p.sku}</strong></td>
        <td><div class="cell-main">${escapeHtml(p.name)}</div><div class="cell-sub">${p.badge}</div></td>
        <td>${p.category}</td>
        <td><strong>${formatINR(p.price)}</strong></td>
        <td>${formatINR(p.cost)}</td>
        <td><span class="status-badge ${stockBadge}">${p.stock} units</span></td>
        <td>${p.warehouse}</td>
        <td>
          <button class="btn btn-outline btn-xs" onclick="restockProduct('${p.id}')">+25 Stock</button>
          <button class="btn btn-ghost btn-xs" onclick="openEntityModal('product', '${p.id}')">Edit</button>
        </td>
      </tr>
    `;
  }).join("");

  renderPagination("inventoryPagination", "products", filtered.length, totalPages);
}

window.restockProduct = function(id) {
  const p = db.products.find(x => x.id === id);
  if (p) {
    p.stock += 25;
    saveDatabase();
    renderCurrentModule();
    showToast(`Added +25 units to ${p.sku}`);
  }
};

/* ==================== 6. MARKETING CAMPAIGNS ==================== */
function renderMarketing() {
  const spend = db.campaigns.reduce((s, c) => s + c.spend, 0);
  const rev = db.campaigns.reduce((s, c) => s + c.revenue, 0);
  const clicks = db.campaigns.reduce((s, c) => s + c.clicks, 0);
  const conv = db.campaigns.reduce((s, c) => s + c.conversions, 0);

  document.getElementById("marketingKpis").innerHTML = `
    <div class="kpi-card"><div class="kpi-label">Total Ad Spend</div><div class="kpi-value">${formatINR(spend)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Attributed Revenue</div><div class="kpi-value" style="color:var(--success)">${formatINR(rev)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Link Clicks</div><div class="kpi-value">${clicks.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Conversions</div><div class="kpi-value">${conv.toLocaleString()}</div></div>
  `;

  const filtered = db.campaigns.filter(c => {
    const matchSt = filters.marketingStatus === "ALL" || c.status === filters.marketingStatus;
    const matchQ = !searchQuery || c.name.toLowerCase().includes(searchQuery) || c.channel.toLowerCase().includes(searchQuery);
    return matchSt && matchQ;
  });

  const { slice, totalPages } = paginate(filtered, pages.campaigns);
  document.getElementById("marketingTableBody").innerHTML = slice.map(c => {
    const ctr = ((c.clicks / (c.impressions || 1)) * 100).toFixed(2);
    const roas = (c.revenue / (c.spend || 1)).toFixed(2);
    return `
      <tr>
        <td><div class="cell-main">${escapeHtml(c.name)}</div><div class="cell-sub">Started ${c.startDate}</div></td>
        <td>${c.channel}</td>
        <td>${renderStatusBadge(c.status)}</td>
        <td>${formatINR(c.spend)} / <span class="cell-sub">${formatINR(c.budget)}</span></td>
        <td>${c.impressions.toLocaleString()}</td>
        <td>${c.clicks.toLocaleString()} (${ctr}%)</td>
        <td><strong style="color:var(--success)">${roas}x</strong></td>
        <td><button class="btn btn-ghost btn-xs" onclick="openEntityModal('campaign', '${c.id}')">Edit</button></td>
      </tr>
    `;
  }).join("");

  renderPagination("marketingPagination", "campaigns", filtered.length, totalPages);
}

/* ==================== 7. E-COMMERCE STOREFRONT ==================== */
window.toggleStoreSubtab = function() {
  storeSubTab = storeSubTab === "catalog" ? "orders" : "catalog";
  document.getElementById("storeCatalogSection").classList.toggle("hidden", storeSubTab !== "catalog");
  document.getElementById("storeOrdersSection").classList.toggle("hidden", storeSubTab !== "orders");
  document.getElementById("toggleStoreTabBtn").innerHTML = storeSubTab === "catalog"
    ? `View Online Orders (<span id="ecomOrdersCount">${db.ecomOrders.length}</span>)`
    : `← Back to Product Catalog`;
  renderStorefront();
};

function renderStorefront() {
  if (storeSubTab === "catalog") {
    const filtered = db.products.filter(p => {
      const matchCat = filters.storeCat === "ALL" || p.category === filters.storeCat;
      const matchQ = !searchQuery || p.name.toLowerCase().includes(searchQuery) || p.category.toLowerCase().includes(searchQuery);
      return matchCat && matchQ;
    });

    document.getElementById("storeProductGrid").innerHTML = filtered.slice(0, 24).map(p => `
      <div class="product-card">
        <div>
          <div class="prod-visual">
            <span class="prod-badge">${p.badge}</span>
            <span>${CAT_ICONS[p.category] || "📦"}</span>
          </div>
          <div class="prod-cat">${p.category} • ⭐ ${p.rating}</div>
          <div class="prod-title">${escapeHtml(p.name)}</div>
        </div>
        <div>
          <div class="prod-meta">
            <span class="prod-price">${formatINR(p.price)}</span>
            <span class="prod-stock">${p.stock > 0 ? p.stock + " in stock" : "Out of stock"}</span>
          </div>
          <button class="btn btn-primary full-btn btn-sm" ${p.stock === 0 ? "disabled" : ""} onclick="addToCart('${p.id}')">
            ${p.stock === 0 ? "Sold Out" : "+ Add to Cart"}
          </button>
        </div>
      </div>
    `).join("");
  } else {
    document.getElementById("ecomOrdersTableBody").innerHTML = db.ecomOrders.map(o => `
      <tr>
        <td><strong>${o.id}</strong></td>
        <td><div class="cell-main">${escapeHtml(o.customer)}</div><div class="cell-sub">${escapeHtml(o.email)}</div></td>
        <td>${escapeHtml(o.city)}</td>
        <td>${escapeHtml(o.itemsSummary)}</td>
        <td><strong>${formatINR(o.amount)}</strong></td>
        <td>${renderStatusBadge(o.fulfillment)}</td>
        <td>${o.date}</td>
      </tr>
    `).join("");
  }
}

window.addToCart = function(productId) {
  const prod = db.products.find(p => p.id === productId);
  if (!prod || prod.stock <= 0) return;
  const existing = cart.find(c => c.id === productId);
  if (existing) {
    if (existing.qty < prod.stock) existing.qty++;
  } else {
    cart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
  }
  updateBadges();
  renderCartDrawer();
  showToast(`Added "${prod.name}" to cart`);
};

window.openCartDrawer = function() {
  renderCartDrawer();
  document.getElementById("cartDrawer").classList.remove("hidden");
};
window.closeCartDrawer = () => document.getElementById("cartDrawer").classList.add("hidden");

function renderCartDrawer() {
  const list = document.getElementById("cartItemsContainer");
  if (!cart.length) {
    list.innerHTML = `<p style="color:var(--text-muted);text-align:center;margin-top:40px;">Your shopping cart is empty.</p>`;
  } else {
    list.innerHTML = cart.map((item, idx) => `
      <div class="cart-row">
        <div>
          <div class="cell-main">${escapeHtml(item.name)}</div>
          <div class="cell-sub">${formatINR(item.price)} × ${item.qty}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-outline btn-xs" onclick="updateCartQty(${idx}, -1)">-</button>
          <strong>${item.qty}</strong>
          <button class="btn btn-outline btn-xs" onclick="updateCartQty(${idx}, 1)">+</button>
        </div>
      </div>
    `).join("");
  }
  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(sub * 0.18);
  document.getElementById("cartSubtotal").textContent = formatINR(sub);
  document.getElementById("cartTax").textContent = formatINR(tax);
  document.getElementById("cartGrandTotal").textContent = formatINR(sub + tax);
}

window.updateCartQty = function(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateBadges();
  renderCartDrawer();
};

window.completeStoreCheckout = function() {
  if (!cart.length) return alert("Add at least one product to cart first.");
  const custName = document.getElementById("checkoutCustName").value.trim() || "Walk-in Store Buyer";
  const custCity = document.getElementById("checkoutCustCity").value.trim() || "Coimbatore";

  const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(sub * 0.18);
  const total = sub + tax;
  const summary = cart.map(i => `${i.name} x${i.qty}`).join(", ");

  // Deduct stock
  cart.forEach(item => {
    const p = db.products.find(x => x.id === item.id);
    if (p) p.stock = Math.max(0, p.stock - item.qty);
  });

  // Create Store Order
  const ordId = "ORD-" + (6001 + db.ecomOrders.length);
  db.ecomOrders.unshift({
    id: ordId,
    customer: custName,
    email: "storefront@buyer.in",
    city: custCity,
    itemsSummary: summary,
    amount: total,
    fulfillment: "Confirmed",
    date: "2026-11-25"
  });

  // Auto-generate Paid Invoice
  db.invoices.unshift({
    id: "INV-2026-" + (4001 + db.invoices.length),
    customerId: "STORE-D2C",
    customerName: custName,
    company: custCity + " Online Order",
    items: cart.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.price })),
    subtotal: sub,
    tax: tax,
    total: total,
    status: "Paid",
    paymentMethod: "E-Com Gateway (UPI/Card)",
    date: "2026-11-25",
    dueDate: "2026-11-25"
  });

  cart = [];
  saveDatabase();
  renderCartDrawer();
  closeCartDrawer();
  renderCurrentModule();
  showToast(`Order ${ordId} placed! Stock deducted & Paid Invoice generated.`);
};

/* ==================== UNIVERSAL CRUD MODAL ==================== */
window.openEntityModal = function(type, editId = null) {
  const modal = document.getElementById("entityModal");
  const title = document.getElementById("entityModalTitle");
  const form = document.getElementById("entityForm");

  if (type === "customer") {
    const item = editId ? db.customers.find(x => x.id === editId) : {};
    title.textContent = editId ? "Edit Customer" : "Add New CRM Customer";
    form.innerHTML = `
      <div class="form-grid-2">
        <div class="form-group"><label>Full Name *</label><input type="text" name="name" required value="${item.name || ""}" /></div>
        <div class="form-group"><label>Company *</label><input type="text" name="company" required value="${item.company || ""}" /></div>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${item.email || ""}" /></div>
        <div class="form-group"><label>City</label><input type="text" name="city" value="${item.city || "Coimbatore"}" /></div>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Segment</label>
          <select name="segment"><option>Enterprise</option><option>SMB</option><option>D2C VIP</option><option>Wholesale</option></select>
        </div>
        <div class="form-group"><label>Lifetime Value (₹)</label><input type="number" name="ltv" value="${item.ltv || 25000}" /></div>
      </div>
      <button type="submit" class="btn btn-primary full-btn">Save Customer</button>
    `;
  } else if (type === "lead") {
    const item = editId ? db.leads.find(x => x.id === editId) : {};
    title.textContent = editId ? "Edit Sales Lead" : "Create New Sales Lead";
    form.innerHTML = `
      <div class="form-grid-2">
        <div class="form-group"><label>Prospect Name *</label><input type="text" name="name" required value="${item.name || ""}" /></div>
        <div class="form-group"><label>Company *</label><input type="text" name="company" required value="${item.company || ""}" /></div>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Lead Source</label>
          <select name="source"><option>Website Form</option><option>Instagram Ads</option><option>Google Search</option><option>Referral</option><option>WhatsApp Campaign</option></select>
        </div>
        <div class="form-group"><label>Pipeline Stage</label>
          <select name="stage"><option>New</option><option>Contacted</option><option>Qualified</option><option>Proposal Sent</option><option>Negotiation</option><option>Won</option></select>
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Estimated Deal Value (₹)</label><input type="number" name="value" value="${item.value || 35000}" /></div>
        <div class="form-group"><label>Lead Score (1-100)</label><input type="number" name="score" value="${item.score || 80}" /></div>
      </div>
      <button type="submit" class="btn btn-primary full-btn">Save Lead</button>
    `;
  } else if (type === "invoice") {
    title.textContent = "Create New GST Tax Invoice";
    form.innerHTML = `
      <div class="form-group"><label>Select Customer *</label>
        <select name="customerId">${db.customers.slice(0, 25).map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.company)})</option>`).join("")}</select>
      </div>
      <div class="form-group"><label>Select Product *</label>
        <select name="productId">${db.products.slice(0, 25).map(p => `<option value="${p.id}">${escapeHtml(p.name)} — ${formatINR(p.price)}</option>`).join("")}</select>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Quantity</label><input type="number" name="qty" min="1" value="2" /></div>
        <div class="form-group"><label>Payment Status</label><select name="status"><option>Paid</option><option>Pending</option><option>Overdue</option></select></div>
      </div>
      <button type="submit" class="btn btn-primary full-btn">Generate GST Invoice</button>
    `;
  } else if (type === "product") {
    const item = editId ? db.products.find(x => x.id === editId) : {};
    title.textContent = editId ? "Edit Product SKU" : "Add New Inventory Product";
    form.innerHTML = `
      <div class="form-grid-2">
        <div class="form-group"><label>Product Name *</label><input type="text" name="name" required value="${item.name || ""}" /></div>
        <div class="form-group"><label>SKU Code *</label><input type="text" name="sku" required value="${item.sku || "SKU-NEW-" + (101 + db.products.length)}" /></div>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Category</label>
          <select name="category"><option>Electronics</option><option>Apparel</option><option>Organic Foods</option><option>Fitness Gear</option><option>Office Supplies</option><option>Home & Kitchen</option></select>
        </div>
        <div class="form-group"><label>Selling Price (₹)</label><input type="number" name="price" required value="${item.price || 1499}" /></div>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Cost Price (₹)</label><input type="number" name="cost" value="${item.cost || 750}" /></div>
        <div class="form-group"><label>Opening Stock Qty</label><input type="number" name="stock" value="${item.stock ?? 40}" /></div>
      </div>
      <button type="submit" class="btn btn-primary full-btn">Save Product</button>
    `;
  } else if (type === "campaign") {
    const item = editId ? db.campaigns.find(x => x.id === editId) : {};
    title.textContent = editId ? "Edit Campaign" : "Launch Marketing Campaign";
    form.innerHTML = `
      <div class="form-group"><label>Campaign Title *</label><input type="text" name="name" required value="${item.name || ""}" /></div>
      <div class="form-grid-2">
        <div class="form-group"><label>Channel</label><select name="channel"><option>Instagram Reels</option><option>Google Search Ads</option><option>WhatsApp Broadcast</option><option>Email Automation</option><option>LinkedIn Sponsored</option></select></div>
        <div class="form-group"><label>Status</label><select name="status"><option>Active</option><option>Scheduled</option><option>Completed</option></select></div>
      </div>
      <div class="form-grid-2">
        <div class="form-group"><label>Budget (₹)</label><input type="number" name="budget" value="${item.budget || 25000}" /></div>
        <div class="form-group"><label>Current Spend (₹)</label><input type="number" name="spend" value="${item.spend || 12000}" /></div>
      </div>
      <button type="submit" class="btn btn-primary full-btn">Save Campaign</button>
    `;
  }

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    if (type === "customer") {
      if (editId) Object.assign(db.customers.find(x => x.id === editId), { ...data, ltv: Number(data.ltv) });
      else db.customers.unshift({ id: "CUST-" + (2001 + db.customers.length), phone: "+91 98422 11009", status: "Active", ordersCount: 1, lastContact: "2026-11-25", ...data, ltv: Number(data.ltv) });
    } else if (type === "lead") {
      if (editId) Object.assign(db.leads.find(x => x.id === editId), { ...data, value: Number(data.value), score: Number(data.score) });
      else db.leads.unshift({ id: "LEAD-" + (3001 + db.leads.length), email: "prospect@company.in", phone: "+91 97890 44112", owner: "Arun K.", createdAt: "2026-11-25", ...data, value: Number(data.value), score: Number(data.score) });
    } else if (type === "invoice") {
      const cust = db.customers.find(c => c.id === data.customerId);
      const prod = db.products.find(p => p.id === data.productId);
      const qty = Number(data.qty) || 1;
      const sub = prod.price * qty;
      const tax = Math.round(sub * 0.18);
      db.invoices.unshift({
        id: "INV-2026-" + (4001 + db.invoices.length),
        customerId: cust.id,
        customerName: cust.name,
        company: cust.company,
        items: [{ productId: prod.id, name: prod.name, qty, price: prod.price }],
        subtotal: sub,
        tax,
        total: sub + tax,
        status: data.status,
        paymentMethod: "Bank Transfer (NEFT)",
        date: "2026-11-25",
        dueDate: "2026-12-10"
      });
    } else if (type === "product") {
      if (editId) Object.assign(db.products.find(x => x.id === editId), { ...data, price: Number(data.price), cost: Number(data.cost), stock: Number(data.stock) });
      else db.products.unshift({ id: "PRD-" + (1001 + db.products.length), reorderLevel: 15, warehouse: "WH-South-01", featured: true, rating: 4.8, badge: "New Arrival", ...data, price: Number(data.price), cost: Number(data.cost), stock: Number(data.stock) });
    } else if (type === "campaign") {
      if (editId) Object.assign(db.campaigns.find(x => x.id === editId), { ...data, budget: Number(data.budget), spend: Number(data.spend) });
      else db.campaigns.unshift({ id: "CMP-" + (5001 + db.campaigns.length), impressions: 42000, clicks: 1850, conversions: 94, revenue: 115000, startDate: "2026-11-25", ...data, budget: Number(data.budget), spend: Number(data.spend) });
    }

    saveDatabase();
    closeEntityModal();
    renderCurrentModule();
    showToast("Record saved successfully!");
  };

  modal.classList.remove("hidden");
};
window.closeEntityModal = () => document.getElementById("entityModal").classList.add("hidden");

window.deleteRecord = function(collection, id) {
  if (!confirm("Delete this record permanently?")) return;
  db[collection] = db[collection].filter(x => x.id !== id);
  saveDatabase();
  renderCurrentModule();
  showToast("Record deleted.");
};

/* ==================== HELPERS & UTILITIES ==================== */
function paginate(arr, page) {
  const totalPages = Math.max(1, Math.ceil(arr.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return { slice: arr.slice(start, start + PAGE_SIZE), totalPages };
}

function renderPagination(containerId, key, totalRows, totalPages) {
  const cur = pages[key];
  document.getElementById(containerId).innerHTML = `
    <span>Showing page <strong>${cur}</strong> of <strong>${totalPages}</strong> (${totalRows} records)</span>
    <div class="page-btns">
      <button class="btn btn-outline btn-xs" ${cur <= 1 ? "disabled" : ""} onclick="changePage('${key}', -1)">Prev</button>
      <button class="btn btn-outline btn-xs" ${cur >= totalPages ? "disabled" : ""} onclick="changePage('${key}', 1)">Next</button>
    </div>
  `;
}

window.changePage = function(key, delta) {
  pages[key] += delta;
  renderCurrentModule();
};

function renderStatusBadge(status) {
  const green = ["Active", "Paid", "Delivered", "Confirmed", "Won"];
  const amber = ["Pending", "At Risk", "Scheduled", "Processing", "Shipped"];
  const red = ["Overdue", "Inactive", "Lost", "Paused"];
  const cls = green.includes(status) ? "st-green" : amber.includes(status) ? "st-amber" : red.includes(status) ? "st-red" : "st-blue";
  return `<span class="status-badge ${cls}">${status}</span>`;
}

function formatINR(num) {
  return "₹" + Number(num || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.add("hidden"), 2800);
}

window.closeMobileDrawer = () => document.getElementById("mobileDrawer").classList.add("hidden");
window.mobileNavSelect = function(mod) {
  closeMobileDrawer();
  switchModule(mod);
};

window.exportAllData = function() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "glirabharat-full-enterprise-db.json";
  a.click();
  showToast("Full database JSON downloaded.");
};

window.exportModuleCSV = function(collection) {
  const rows = db[collection];
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== "object");
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `glirabharat-${collection}.csv`;
  a.click();
  showToast(`Exported ${rows.length} ${collection} rows to CSV.`);
};
