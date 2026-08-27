// State Management
const state = {
  currentTab: 'dashboard',
  dbConnected: false,
  metrics: null,
  products: [],
  suppliers: [],
  facilities: [],
  activeDisruption: null, // { type, id, result }
  networkInstance: null,
  physicsEnabled: true,
  currentGraphProduct: ''
};

// Element Selectors
const navButtons = {
  dashboard: document.getElementById('nav-dashboard'),
  simulator: document.getElementById('nav-simulator'),
  bom: document.getElementById('nav-bom'),
  suppliers: document.getElementById('nav-suppliers'),
  graph: document.getElementById('nav-graph')
};

const viewSections = {
  dashboard: document.getElementById('view-dashboard'),
  simulator: document.getElementById('view-simulator'),
  bom: document.getElementById('view-bom'),
  suppliers: document.getElementById('view-suppliers'),
  graph: document.getElementById('view-graph')
};

const pageTitle = document.getElementById('page-title');
const dbStatusText = document.getElementById('db-status-text');
const dbStatusDot = document.getElementById('db-status-dot');

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  await checkDbStatus();
  
  if (state.dbConnected) {
    await loadInitialData();
  }
});

// 1. Navigation Setup
function setupNavigation() {
  Object.keys(navButtons).forEach(tab => {
    navButtons[tab].addEventListener('click', () => {
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  // Update nav buttons
  Object.keys(navButtons).forEach(key => {
    if (key === tabId) {
      navButtons[key].classList.add('active');
    } else {
      navButtons[key].classList.remove('active');
    }
  });

  // Update views
  Object.keys(viewSections).forEach(key => {
    if (key === tabId) {
      viewSections[key].classList.remove('hidden');
    } else {
      viewSections[key].classList.add('hidden');
    }
  });

  state.currentTab = tabId;
  pageTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1).replace('bom', 'BOM');

  // Trigger tab-specific loaders
  if (state.dbConnected) {
    if (tabId === 'dashboard') loadDashboard();
    else if (tabId === 'simulator') loadSimulatorTab();
    else if (tabId === 'bom') loadBomTab();
    else if (tabId === 'suppliers') loadSuppliersTab();
    else if (tabId === 'graph') loadGraphTab();
  }
}

// 2. Event Listeners Setup
function setupEventListeners() {
  // Disruption type toggles
  const btnDisruptSupplier = document.getElementById('disrupt-type-supplier');
  const btnDisruptFacility = document.getElementById('disrupt-type-facility');
  const disruptSelect = document.getElementById('disrupt-entity-select');
  const disruptLabel = document.getElementById('disrupt-entity-label');

  btnDisruptSupplier.addEventListener('click', () => {
    btnDisruptSupplier.className = "flex-1 py-1.5 px-3 rounded-md text-xs font-semibold text-white bg-blue-600 transition shadow";
    btnDisruptFacility.className = "flex-1 py-1.5 px-3 rounded-md text-xs font-semibold text-gray-400 hover:text-white transition";
    disruptLabel.textContent = "Select Supplier";
    populateDisruptionDropdown('SUPPLIER');
  });

  btnDisruptFacility.addEventListener('click', () => {
    btnDisruptFacility.className = "flex-1 py-1.5 px-3 rounded-md text-xs font-semibold text-white bg-blue-600 transition shadow";
    btnDisruptSupplier.className = "flex-1 py-1.5 px-3 rounded-md text-xs font-semibold text-gray-400 hover:text-white transition";
    disruptLabel.textContent = "Select Facility";
    populateDisruptionDropdown('FACILITY');
  });

  // Run simulation button
  document.getElementById('btn-run-simulation').addEventListener('click', runDisruptionSimulation);

  // BOM product select change
  document.getElementById('bom-product-select').addEventListener('change', (e) => {
    loadBomData(e.target.value);
  });

  // Graph Explorer product select change
  document.getElementById('graph-product-select').addEventListener('change', (e) => {
    loadGraphData(e.target.value);
  });

  // Graph physics and fit control buttons
  document.getElementById('btn-toggle-physics').addEventListener('click', toggleGraphPhysics);
  document.getElementById('btn-reset-graph').addEventListener('click', fitGraphScreen);
}

// 3. Database Connection Check
async function checkDbStatus() {
  try {
    const res = await fetch('/api/db-status');
    const data = await res.json();
    if (data.status === 'connected') {
      state.dbConnected = true;
      dbStatusDot.className = "w-2.5 h-2.5 bg-emerald-500 rounded-full flex-shrink-0";
      dbStatusText.textContent = "CognoDB Connected";
    } else {
      setDbDisconnected(data.error);
    }
  } catch (err) {
    setDbDisconnected(err.message);
  }
}

function setDbDisconnected(errMessage) {
  state.dbConnected = false;
  dbStatusDot.className = "w-2.5 h-2.5 bg-rose-500 rounded-full flex-shrink-0";
  dbStatusText.textContent = "CognoDB Disconnected";
  dbStatusText.title = errMessage || "Error connecting to db";
  
  // Show error states across the UI
  alert(`Warning: Backend is unable to connect to your CognoDB Cloud instance. Ensure your credentials are set correctly in the chainguard/.env file.\n\nError: ${errMessage}`);
}

// 4. Loading Initial Core Data
async function loadInitialData() {
  try {
    // Fetch catalogs
    const [pRes, sRes, fRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/suppliers'),
      fetch('/api/facilities')
    ]);

    state.products = await pRes.json();
    state.suppliers = await sRes.json();
    state.facilities = await fRes.json();

    // Setup initial view
    loadDashboard();
    
    // Populate Dropdowns
    populateProductDropdowns();
  } catch (err) {
    console.error('Error loading initial data:', err);
  }
}

// Populate BOM and Graph product selects
function populateProductDropdowns() {
  const bomSelect = document.getElementById('bom-product-select');
  const graphSelect = document.getElementById('graph-product-select');
  
  bomSelect.innerHTML = '';
  graphSelect.innerHTML = '';

  state.products.forEach(p => {
    const opt1 = document.createElement('option');
    opt1.value = p.sku;
    opt1.textContent = `${p.sku} - ${p.name}`;
    bomSelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = p.sku;
    opt2.textContent = `${p.sku} - ${p.name}`;
    graphSelect.appendChild(opt2);
  });

  if (state.products.length > 0) {
    loadBomData(state.products[0].sku);
    state.currentGraphProduct = state.products[0].sku;
  }
}



// 6. Dashboard Page Loader
async function loadDashboard() {
  try {
    const res = await fetch('/api/metrics');
    state.metrics = await res.json();

    // Render Stats
    document.getElementById('stat-products').textContent = state.metrics.products;
    document.getElementById('stat-components').textContent = state.metrics.components;
    document.getElementById('stat-suppliers').textContent = state.metrics.suppliers;
    document.getElementById('stat-highrisk-suppliers').textContent = state.metrics.highRiskSuppliers;
    document.getElementById('stat-highrisk-facilities').textContent = state.metrics.highRiskFacilities;

    // Render High Risk Monitors list
    const riskContainer = document.getElementById('high-risk-list');
    riskContainer.innerHTML = '';

    const highRiskSuppliers = state.suppliers.filter(s => s.riskRating === 'HIGH');
    const highRiskFacilities = state.facilities.filter(f => f.riskRating === 'HIGH');

    if (highRiskSuppliers.length === 0 && highRiskFacilities.length === 0) {
      riskContainer.innerHTML = `
        <div class="p-6 text-center text-emerald-500 text-sm">
          <i class="fa-solid fa-circle-check text-2xl mb-2 block text-emerald-600"></i>
          All monitored suppliers and facilities are currently operating at Low/Medium risk.
        </div>
      `;
      return;
    }

    // List Suppliers
    highRiskSuppliers.forEach(sup => {
      const el = document.createElement('div');
      el.className = "p-5 flex items-center justify-between hover:bg-gray-900/40 transition";
      el.innerHTML = `
        <div class="flex items-center">
          <div class="w-10 h-10 bg-red-950/30 border border-red-800/30 text-red-500 rounded-lg flex items-center justify-center mr-4">
            <i class="fa-solid fa-truck-ramp-box"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-white">${sup.name}</h4>
            <p class="text-xs text-gray-500">Supplier • HQ: ${sup.country} • ID: ${sup.id}</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <span class="px-2.5 py-0.5 text-3xs font-bold bg-red-900/30 border border-red-800/60 rounded text-red-400 uppercase">HIGH RISK</span>
          <button onclick="launchQuickDisruption('SUPPLIER', '${sup.id}')" class="text-xs bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-800/30 font-semibold py-1.5 px-3 rounded-lg transition">
            Simulate Failure
          </button>
        </div>
      `;
      riskContainer.appendChild(el);
    });

    // List Facilities
    highRiskFacilities.forEach(fac => {
      const el = document.createElement('div');
      el.className = "p-5 flex items-center justify-between hover:bg-gray-900/40 transition";
      el.innerHTML = `
        <div class="flex items-center">
          <div class="w-10 h-10 bg-red-950/30 border border-red-800/30 text-red-500 rounded-lg flex items-center justify-center mr-4">
            <i class="fa-solid fa-building-circle-exclamation"></i>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-white">${fac.name}</h4>
            <p class="text-xs text-gray-500">Facility • ${fac.city}, ${fac.country} • ID: ${fac.id}</p>
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <span class="px-2.5 py-0.5 text-3xs font-bold bg-red-900/30 border border-red-800/60 rounded text-red-400 uppercase">HIGH RISK</span>
          <button onclick="launchQuickDisruption('FACILITY', '${fac.id}')" class="text-xs bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-800/30 font-semibold py-1.5 px-3 rounded-lg transition">
            Simulate Failure
          </button>
        </div>
      `;
      riskContainer.appendChild(el);
    });
  } catch (err) {
    console.error('Error loading dashboard metrics:', err);
  }
}

// Quick trigger from Dashboard List
window.launchQuickDisruption = function(type, id) {
  switchTab('simulator');
  const btnSupplier = document.getElementById('disrupt-type-supplier');
  const btnFacility = document.getElementById('disrupt-type-facility');
  const label = document.getElementById('disrupt-entity-label');

  if (type === 'SUPPLIER') {
    btnSupplier.click();
  } else {
    btnFacility.click();
  }
  
  document.getElementById('disrupt-entity-select').value = id;
  document.getElementById('btn-run-simulation').click();
};

// 7. Simulator Tab Loaders
function loadSimulatorTab() {
  // Default to supplier list on click
  const btnSupplier = document.getElementById('disrupt-type-supplier');
  if (btnSupplier.classList.contains('text-white')) {
    populateDisruptionDropdown('SUPPLIER');
  } else {
    populateDisruptionDropdown('FACILITY');
  }
}

function populateDisruptionDropdown(type) {
  const select = document.getElementById('disrupt-entity-select');
  select.innerHTML = '';
  
  const dataset = type === 'SUPPLIER' ? state.suppliers : state.facilities;
  
  dataset.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.id} - ${item.name} (${item.riskRating})`;
    select.appendChild(opt);
  });
}

// 8. Run Disruption Simulation
async function runDisruptionSimulation() {
  const select = document.getElementById('disrupt-entity-select');
  const id = select.value;
  if (!id) return;
  
  const isSupplier = document.getElementById('disrupt-type-supplier').classList.contains('text-white');
  const type = isSupplier ? 'SUPPLIER' : 'FACILITY';

  // Toggle Loading
  const btnSim = document.getElementById('btn-run-simulation');
  btnSim.disabled = true;
  btnSim.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i> Analyzing paths...`;

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id })
    });
    
    const result = await res.json();
    state.activeDisruption = { type, id, result };
    
    renderSimulationResult(result);
  } catch (err) {
    alert(`Simulation failed: ${err.message}`);
  } finally {
    btnSim.disabled = false;
    btnSim.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2.5"></i> Simulate Disruption`;
  }
}

// Render simulation outcome UI components
function renderSimulationResult(data) {
  document.getElementById('simulation-empty-state').classList.add('hidden');
  const resultsDiv = document.getElementById('simulation-results');
  resultsDiv.classList.remove('hidden');

  // Name & Risk badge
  document.getElementById('sim-target-name').textContent = data.disruption.name;
  
  const severityBadge = document.getElementById('sim-severity-badge');
  const severityText = document.getElementById('sim-severity-text');
  
  severityBadge.className = `px-4 py-1.5 rounded-lg text-xs font-bold flex items-center border badge-${data.metrics.riskSeverity}`;
  severityText.textContent = data.metrics.riskSeverity;

  // Set counter cards
  document.getElementById('sim-stat-components').textContent = data.metrics.affectedComponents;
  document.getElementById('sim-stat-products').textContent = data.metrics.affectedProducts;
  document.getElementById('sim-stat-facilities').textContent = data.metrics.highRiskFacilities;
  
  // Format revenue as Currency Millions or Thousands
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };
  
  document.getElementById('sim-stat-revenue').textContent = formatCurrency(data.metrics.monthlyRevenueAtRisk) + ' / mo';

  // Render products table
  const pTable = document.getElementById('sim-products-table');
  pTable.innerHTML = '';
  
  if (data.products.length === 0) {
    pTable.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No downstream product impact detected for this node.</td></tr>`;
  } else {
    data.products.forEach(p => {
      const row = document.createElement('tr');
      row.className = "border-b border-gray-800/50 hover:bg-gray-900/20 transition text-gray-300";
      row.innerHTML = `
        <td class="px-6 py-4 font-mono text-xs text-white">${p.sku}</td>
        <td class="px-6 py-4">${p.name}</td>
        <td class="px-6 py-4 text-right">${formatCurrency(p.price)}</td>
        <td class="px-6 py-4 text-right">${p.monthlyDemand.toLocaleString()}</td>
        <td class="px-6 py-4 text-right text-red-400 font-semibold">${formatCurrency(p.monthlyRevenueAtRisk)}</td>
      `;
      pTable.appendChild(row);
    });
  }

  // Render Alternative Recommendations
  const altContainer = document.getElementById('sim-alternatives-container');
  altContainer.innerHTML = '';

  if (data.alternatives.length === 0) {
    altContainer.innerHTML = `
      <div class="text-center py-12 text-gray-500 text-sm">
        <i class="fa-solid fa-circle-xmark text-2xl text-gray-700 mb-2 block"></i>
        No alternative suppliers found in graph records. Ensure other suppliers supply this component in your seed database.
      </div>
    `;
  } else {
    data.alternatives.forEach(compGroup => {
      const compCard = document.createElement('div');
      compCard.className = "bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-4";
      
      let headerHTML = `
        <div class="flex justify-between items-start border-b border-gray-800 pb-3">
          <div>
            <h4 class="text-sm font-semibold text-white">${compGroup.componentName}</h4>
            <p class="text-2xs text-gray-500 font-mono">Component ID: ${compGroup.componentId}</p>
          </div>
          <div class="text-right">
            <span class="text-xs text-gray-400 block">Required volume</span>
            <span class="text-sm font-bold text-blue-400">${compGroup.requiredMonthlyVolume.toLocaleString()} units/mo</span>
          </div>
        </div>
      `;

      let alternativesListHTML = `<div class="space-y-3">`;

      if (compGroup.alternatives.length === 0) {
        alternativesListHTML += `
          <div class="text-xs text-yellow-500/70 py-2 flex items-center">
            <i class="fa-solid fa-triangle-exclamation mr-2"></i> No active alternatives available with LOW/MEDIUM risk ratings.
          </div>
        `;
      } else {
        compGroup.alternatives.forEach(alt => {
          const capacityWarning = !alt.capacityFit 
            ? `<span class="px-2 py-0.5 text-3xs font-bold bg-red-900/40 border border-red-800 text-red-400 rounded-full inline-block mt-1 animate-pulse"><i class="fa-solid fa-circle-exclamation mr-1"></i> INSUFFICIENT CAPACITY</span>`
            : `<span class="px-2 py-0.5 text-3xs font-bold bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-full inline-block mt-1">CAPACITY FIT</span>`;

          alternativesListHTML += `
            <div class="bg-gray-950 p-4 border border-gray-850 rounded-lg flex items-center justify-between shadow hover:border-gray-700 transition">
              <div class="space-y-1.5">
                <div class="flex items-center space-x-2">
                  <h5 class="text-xs font-bold text-white">${alt.name}</h5>
                  <span class="px-1.5 py-0.2 text-4xs font-bold border rounded bg-gray-900/60 uppercase ${alt.riskRating === 'LOW' ? 'text-emerald-400 border-emerald-800/40' : 'text-yellow-400 border-yellow-800/40'}">${alt.riskRating} RISK</span>
                </div>
                <div class="text-3xs text-gray-500 space-x-2">
                  <span>HQ: ${alt.country}</span>
                  <span>•</span>
                  <span>Unit Price: $${alt.price}</span>
                  <span>•</span>
                  <span>Lead Time: ${alt.leadTimeDays} days</span>
                </div>
                <div class="flex items-baseline space-x-2">
                  <span class="text-3xs text-gray-500">Supplier Capacity: ${alt.capacity.toLocaleString()}</span>
                  ${capacityWarning}
                </div>
              </div>
              <div class="text-center p-2 rounded-lg bg-gray-900 border border-gray-800 min-w-[70px]">
                <span class="text-4xs font-semibold text-gray-500 uppercase tracking-wider block">Score</span>
                <span class="text-lg font-black text-emerald-400">${alt.resilienceScore}</span>
              </div>
            </div>
          `;
        });
      }
      
      alternativesListHTML += `</div>`;
      compCard.innerHTML = headerHTML + alternativesListHTML;
      altContainer.appendChild(compCard);
    });
  }

  // Render the disruption propagation path
  renderDisruptionPath(data.disruption.type, data.disruption.name, data.affectedComponents, data.products);
}

// Render the vertical propagation path tree in the simulator UI
function renderDisruptionPath(type, targetName, affectedComponents, products) {
  const container = document.getElementById('sim-path-container');
  container.innerHTML = '';

  const createNodeHTML = (title, subtitle, icon, colorClass) => {
    return `
      <div class="flex items-center p-4 bg-gray-900 border border-gray-800 rounded-xl w-72 shadow hover:border-gray-700 transition">
        <div class="w-10 h-10 ${colorClass} rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
          <i class="${icon} text-lg"></i>
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-4xs text-gray-500 font-semibold uppercase tracking-wider">${title}</p>
          <p class="text-xs font-bold text-white truncate" title="${subtitle}">${subtitle}</p>
        </div>
      </div>
    `;
  };

  const createArrowHTML = () => {
    return `
      <div class="flex items-center justify-center py-1.5">
        <i class="fa-solid fa-chevron-down text-red-500 text-sm animate-pulse"></i>
      </div>
    `;
  };

  // Node 1: Disrupted Source
  const sourceTitle = type === 'SUPPLIER' ? 'Disrupted Supplier' : 'Closed Facility';
  const sourceIcon = type === 'SUPPLIER' ? 'fa-solid fa-truck-ramp-box' : 'fa-solid fa-industry';
  const sourceColor = 'bg-red-950/40 border border-red-800/40 text-red-400';
  let html = createNodeHTML(sourceTitle, targetName, sourceIcon, sourceColor);

  // Node 2: Affected Components
  html += createArrowHTML();
  const compCount = affectedComponents.length;
  const compLabel = compCount === 1 ? affectedComponents[0] : `${compCount} Affected Components`;
  html += createNodeHTML('Affected Components', compLabel, 'fa-solid fa-microchip', 'bg-indigo-950/40 border border-indigo-850/40 text-indigo-400');

  // Node 3: Sub-assemblies
  const assemblies = affectedComponents.filter(c => c.toLowerCase().includes('assembly') || c.toLowerCase().includes('mainboard'));
  if (assemblies.length > 0) {
    html += createArrowHTML();
    const assyLabel = assemblies.length === 1 ? assemblies[0] : `${assemblies.length} Assemblies Blocked`;
    html += createNodeHTML('Sub-Assemblies', assyLabel, 'fa-solid fa-sitemap', 'bg-purple-950/40 border border-purple-850/40 text-purple-400');
  }

  // Node 4: Downstream Products
  html += createArrowHTML();
  const prodCount = products.length;
  const prodLabel = prodCount === 1 ? products[0].name : `${prodCount} Products Blocked`;
  html += createNodeHTML('Impacted Final Products', prodLabel, 'fa-solid fa-box', 'bg-blue-950/40 border border-blue-850/40 text-blue-400');

  container.innerHTML = `<div class="space-y-1 flex flex-col items-center">${html}</div>`;
}

// 9. BOM Explorer Page Loader
function loadBomTab() {
  const select = document.getElementById('bom-product-select');
  if (select.value) {
    loadBomData(select.value);
  }
}

async function loadBomData(sku) {
  const pTitle = document.getElementById('bom-product-title');
  const pDesc = document.getElementById('bom-product-desc');
  const tableBody = document.getElementById('bom-table-body');
  
  // Find product details
  const p = state.products.find(prod => prod.sku === sku);
  if (p) {
    pTitle.textContent = `${p.name} - Detailed Bill of Materials`;
    pDesc.textContent = `SKU: ${p.sku} • Market Price: $${p.price} • Monthly Market Demand: ${p.monthlyDemand.toLocaleString()} units`;
  }

  tableBody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500"><i class="fa-solid fa-spinner animate-spin mr-2"></i> Fetching BOM layers...</td></tr>`;

  try {
    const res = await fetch(`/api/bom/${sku}`);
    const bom = await res.json();
    
    tableBody.innerHTML = '';
    
    if (bom.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-gray-500">No components defined for this product.</td></tr>`;
      return;
    }

    bom.forEach(item => {
      const riskClass = item.supplierRisk === 'HIGH' ? 'text-red-400 border-red-900/60 bg-red-950/20' : 
                          item.supplierRisk === 'MEDIUM' ? 'text-yellow-400 border-yellow-900/60 bg-yellow-950/20' : 
                          'text-emerald-400 border-emerald-900/60 bg-emerald-950/20';

      const row = document.createElement('tr');
      row.className = "border-b border-gray-800/50 hover:bg-gray-900/20 transition text-gray-300";
      
      row.innerHTML = `
        <td class="px-6 py-4 font-mono text-xs text-white">${item.componentId}</td>
        <td class="px-6 py-4 font-medium text-gray-200">${item.componentName}</td>
        <td class="px-6 py-4 text-xs">${item.category}</td>
        <td class="px-6 py-4 text-right">$${item.cost}</td>
        <td class="px-6 py-4 text-center font-bold text-blue-400">${item.depth}</td>
        <td class="px-6 py-4 text-center font-mono text-2xs text-gray-400">${item.quantities.join(' → ')}</td>
        <td class="px-6 py-4 text-right font-bold text-white">${item.requiredQuantityPerProduct}</td>
        <td class="px-6 py-4 text-gray-400">${item.supplierName || 'N/A'}</td>
        <td class="px-6 py-4 text-center">
          ${item.supplierRisk ? `
            <span class="px-2 py-0.5 text-4xs font-bold border rounded uppercase ${riskClass}">
              ${item.supplierRisk}
            </span>
          ` : '<span class="text-gray-500 font-mono">-</span>'}
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading BOM:', err);
    tableBody.innerHTML = `<tr><td colspan="9" class="px-6 py-8 text-center text-red-500">Error loading BOM: ${err.message}</td></tr>`;
  }
}

// 10. Suppliers Registry Page Loader
async function loadSuppliersTab() {
  const tableBody = document.getElementById('suppliers-table-body');
  const countBadge = document.getElementById('supplier-count-badge');
  
  tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500"><i class="fa-solid fa-spinner animate-spin mr-2"></i> Querying registry...</td></tr>`;

  try {
    const res = await fetch('/api/suppliers');
    const suppliers = await res.json();
    state.suppliers = suppliers; // Update local state cache
    
    countBadge.textContent = `${suppliers.length} active suppliers`;
    tableBody.innerHTML = '';

    if (suppliers.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">No active suppliers found in database registry.</td></tr>`;
      return;
    }

    suppliers.forEach(s => {
      const badgeClass = `badge-${s.riskRating}`;
      const row = document.createElement('tr');
      row.className = "border-b border-gray-800/50 hover:bg-gray-900/20 transition text-gray-300";
      
      row.innerHTML = `
        <td class="px-6 py-4 font-mono text-xs text-white">${s.id}</td>
        <td class="px-6 py-4 font-medium text-gray-200">${s.name}</td>
        <td class="px-6 py-4">${s.country}</td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-0.8 text-3xs font-bold border rounded-full uppercase ${badgeClass}">
            <i class="fa-solid fa-circle text-4xs mr-1 dot-${s.riskRating}"></i> ${s.riskRating}
          </span>
        </td>
        <td class="px-6 py-4 text-center">
          <button onclick="launchQuickDisruption('SUPPLIER', '${s.id}')" class="text-xs bg-red-900/20 hover:bg-red-800/40 text-red-400 border border-red-800/30 font-semibold py-1.5 px-3 rounded-lg transition shadow-sm">
            Disrupt Supplier
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading suppliers:', err);
    tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Error loading registry: ${err.message}</td></tr>`;
  }
}

// 11. Graph Explorer Page Loader
function loadGraphTab() {
  const select = document.getElementById('graph-product-select');
  if (select.value) {
    loadGraphData(select.value);
  }
}

async function loadGraphData(sku) {
  state.currentGraphProduct = sku;
  const canvas = document.getElementById('graph-canvas');
  canvas.innerHTML = '<div class="text-gray-500 flex items-center justify-center h-full"><i class="fa-solid fa-spinner animate-spin mr-2"></i> Building Network Topology...</div>';

  try {
    const res = await fetch(`/api/graph/product/${sku}`);
    const graphData = await res.json();
    
    // Check if we have an active simulation running and fetch highlight elements
    let highlightNodeIds = [];
    let highlightEdgeIds = [];
    if (state.activeDisruption) {
      try {
        const hRes = await fetch(`/api/graph/disruption/${state.activeDisruption.type}/${state.activeDisruption.id}`);
        const hData = await hRes.json();
        highlightNodeIds = hData.nodeIds || [];
        highlightEdgeIds = hData.edgeIds || [];
      } catch (err) {
        console.error('Error fetching highlight items:', err);
      }
    }

    // Format nodes for vis-network
    const nodes = graphData.nodes.map(n => {
      let color = '';
      let fontColor = '#ffffff';
      
      // Node colors based on type
      if (n.type === 'Product') color = '#1d4ed8'; // Blue
      else if (n.type === 'Component') color = '#4f46e5'; // Indigo
      else if (n.type === 'Supplier') color = '#0d9488'; // Teal
      else if (n.type === 'Facility') color = '#d97706'; // Amber

      const isHighlighted = highlightNodeIds.includes(n.id);
      
      return {
        id: n.id,
        label: n.label,
        title: n.title,
        color: {
          background: color,
          border: isHighlighted ? '#ef4444' : color,
          highlight: {
            background: isHighlighted ? '#dc2626' : color,
            border: '#fca5a5'
          }
        },
        borderWidth: isHighlighted ? 4 : 1,
        shadow: isHighlighted ? { enabled: true, color: '#dc2626', size: 10, x: 0, y: 0 } : { enabled: true }
      };
    });

    // Format edges for vis-network
    const edges = graphData.edges.map(e => {
      const isHighlighted = highlightEdgeIds.includes(e.id);
      return {
        id: e.id,
        from: e.from,
        to: e.to,
        label: e.label || '',
        dashes: e.dashes || false,
        color: {
          color: isHighlighted ? '#ef4444' : '#4b5563',
          highlight: isHighlighted ? '#ef4444' : '#3b82f6',
          hover: isHighlighted ? '#dc2626' : '#6b7280'
        },
        width: isHighlighted ? 4 : 1,
        shadow: isHighlighted ? { enabled: true, color: '#dc2626', size: 6 } : { enabled: false }
      };
    });

    // vis-network Configuration
    const data = {
      nodes: new vis.DataSet(nodes),
      edges: new vis.DataSet(edges)
    };

    const options = {
      nodes: {
        shape: 'box',
        margin: 10,
        font: {
          color: '#ffffff',
          face: 'Inter, sans-serif',
          size: 11
        },
        borderWidth: 1,
        shadow: true
      },
      edges: {
        arrows: {
          to: { enabled: true, scaleFactor: 0.6 }
        },
        font: {
          color: '#9ca3af',
          size: 8,
          face: 'Inter, sans-serif',
          strokeWidth: 0
        },
        smooth: {
          type: 'cubicBezier',
          roundness: 0.3
        }
      },
      physics: {
        enabled: state.physicsEnabled,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -35,
          centralGravity: 0.015,
          springLength: 90,
          springConstant: 0.08
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 150
      }
    };

    canvas.innerHTML = '';
    state.networkInstance = new vis.Network(canvas, data, options);
  } catch (err) {
    console.error('Error drawing graph:', err);
    canvas.innerHTML = `<div class="text-red-500 flex items-center justify-center h-full"><i class="fa-solid fa-triangle-exclamation mr-2"></i> Error building graph: ${err.message}</div>`;
  }
}

function toggleGraphPhysics() {
  state.physicsEnabled = !state.physicsEnabled;
  const btn = document.getElementById('btn-toggle-physics');
  
  if (state.physicsEnabled) {
    btn.className = "text-xs bg-gray-900 hover:bg-gray-800 border border-gray-800 py-2 px-3.5 rounded-lg font-semibold transition flex items-center text-white";
  } else {
    btn.className = "text-xs bg-gray-900 hover:bg-gray-800 border border-gray-800 py-2 px-3.5 rounded-lg font-semibold transition flex items-center text-gray-500";
  }

  if (state.networkInstance) {
    state.networkInstance.setOptions({ physics: { enabled: state.physicsEnabled } });
  }
}

function fitGraphScreen() {
  if (state.networkInstance) {
    state.networkInstance.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
  }
}
