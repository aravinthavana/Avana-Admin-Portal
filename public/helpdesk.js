/* ─────────────────────────────────────────────────────────────
   Avana Admin Help Desk — helpdesk.js
   ───────────────────────────────────────────────────────────── */

const FLOOR_OPTIONS = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor', 'Other'];

let STATIONERY_PRINTING_ITEMS = [];
let STATIONERY_ITEMS = [];

async function fetchStationeryCatalog() {
  try {
    const res = await fetch('/api/employee/stationery-items');
    if (res.ok) {
      const catalog = await res.json();
      STATIONERY_PRINTING_ITEMS = [];
      STATIONERY_ITEMS = [];
      Object.keys(catalog).forEach(item => {
        if (catalog[item] === 'printing') {
          STATIONERY_PRINTING_ITEMS.push(item);
        } else {
          STATIONERY_ITEMS.push(item);
        }
      });
      STATIONERY_PRINTING_ITEMS.sort();
      STATIONERY_ITEMS.sort();
    }
  } catch (e) {
    console.error('Failed to fetch stationery catalog:', e);
  }
}

const CATEGORIES = [
  {
    id: 'conference',
    title: 'Conference Room Booking',
    icon: '📅',
    desc: 'Book the conference room or view the current schedule',
    accent: '#4f46e5',
    iconBg: '#eef2ff',
    link: '/booking'
  },
  {
    id: 'stationery',
    title: 'Stationery Request',
    icon: '✏️',
    desc: 'Request office stationery and printing materials',
    accent: '#10b981',
    iconBg: '#d1fae5',
  },
  {
    id: 'hk_material',
    title: 'Housekeeping Material Request',
    icon: '🧴',
    desc: 'Request housekeeping and cleaning supplies',
    accent: '#0891b2',
    iconBg: '#e0f7fa',
    restrictTo: ['bhuvaneshravi@avanamedical.com']
  },
  {
    id: 'admin_support',
    title: 'Admin Support',
    icon: '🤝',
    desc: 'Get help with general administrative tasks',
    accent: '#0ea5e9',
    iconBg: '#e0f2fe',
  },
  {
    id: 'maintenance',
    title: 'Maintenance Complaint',
    icon: '🛠️',
    desc: 'Report AC, electrical, plumbing or furniture issues',
    accent: '#ef4444',
    iconBg: '#fee2e2',
  },
  {
    id: 'housekeeping',
    title: 'Housekeeping Request',
    icon: '🧹',
    desc: 'Request cleaning, pantry, or waste removal services',
    accent: '#f59e0b',
    iconBg: '#fef3c7',
  },
  {
    id: 'office_asset',
    title: 'Office Asset Request',
    icon: '💼',
    desc: 'Request furniture, equipment or asset replacement',
    accent: '#06b6d4',
    iconBg: '#cffafe',
  },
  {
    id: 'print_scan',
    title: 'Printing & Scanning',
    icon: '🖨️',
    desc: 'Submit bulk print, scan, or binding/lamination requests',
    accent: '#8b5cf6',
    iconBg: '#ede9fe',
  }
];

const HK_MATERIAL_ITEMS = [
  'Colin', 'Exo', 'Floor Broom', 'Garbage Bag Large', 'Garbage Bag Small',
  'Harpic', 'Hit Spray', 'J-son Tissue Box', 'Floor Cleaning Liquid',
  'Mop', 'Naphthaline / Freshener', 'Odonil Air Freshener Blocks Mix Pack',
  'Room Spray', 'Scrubber', 'Toilet Tissue Roll', 'Dishwash Liquid',
  'Waste Cloth', 'Phenol', 'Floor Wiper', 'EC Mop',
  'Handwash Tissue Roll', 'Handwash Liquid', 'Other'
];

/* ── Build Cards ─────────────────────────────────────────────── */
function buildCards() {
  const grid = document.getElementById('hd-grid');
  const loggedInEmail = (sessionStorage.getItem('employeeOutlookEmail') || '').toLowerCase().trim();

  CATEGORIES.forEach(cat => {
    // Restrict certain categories to specific email accounts
    if (cat.restrictTo) {
      const allowed = cat.restrictTo.map(e => e.toLowerCase());
      if (!allowed.includes(loggedInEmail)) return;
    }

    const card = document.createElement('div');
    card.className = 'hd-card';
    card.id = `card-${cat.id}`;
    card.style.setProperty('--card-accent', cat.accent);
    card.style.setProperty('--card-icon-bg', cat.iconBg);
    card.style.setProperty('--card-accent-text', cat.accent);
    card.innerHTML = `
      <div class="hd-card-icon">${cat.icon}</div>
      <div class="hd-card-title">${cat.title}</div>
      <div class="hd-card-desc">${cat.desc}</div>
      <div class="hd-card-arrow" style="color:${cat.accent};">
        ${cat.link ? 'Book Conference Room →' : 'Submit Request →'}
      </div>
    `;
    if (cat.link) {
      card.addEventListener('click', () => window.location.href = cat.link);
    } else {
      card.addEventListener('click', () => openModal(cat));
    }
    grid.appendChild(card);
  });
}

/* ── Modal Open/Close ─────────────────────────────────────────── */
let currentCategory = null;

async function openModal(cat) {
  currentCategory = cat;
  document.getElementById('hd-modal-title').textContent = cat.title;
  const iconEl = document.getElementById('hd-modal-icon');
  iconEl.textContent = cat.icon;
  iconEl.style.background = cat.iconBg;
  
  if (cat.id === 'stationery') {
    await fetchStationeryCatalog();
  }

  // Reset HK items state when opening
  if (cat.id === 'hk_material') {
    selectedHkItems = [];
  }

  document.getElementById('hd-modal-body').innerHTML = renderForm(cat.id);
  document.getElementById('hd-overlay').classList.add('active');

  // Wire up stationery toggle if needed
  if (cat.id === 'stationery') {
    document.querySelectorAll('.hd-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.hd-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateStationeryItems(btn.dataset.type);
      });
    });
    // Default load printing items
    updateStationeryItems('printing');
  }

  // Wire up HK material dropdown
  if (cat.id === 'hk_material') {
    renderHkOptionsList();
    setupHkDropdownHandlers();
  }

  document.getElementById('hd-modal-body').querySelector('form')
    .addEventListener('submit', handleSubmit);
}

function closeModal() {
  document.getElementById('hd-overlay').classList.remove('active');
  currentCategory = null;
}

/* ── Form Renderers ───────────────────────────────────────────── */
function floorSelect(name = 'floor') {
  return `<select name="${name}" required>
    <option value="">— Select Floor —</option>
    ${FLOOR_OPTIONS.map(f => `<option value="${f}">${f}</option>`).join('')}
  </select>`;
}

function contactFields() {
  const loginEmail = sessionStorage.getItem('employeeOutlookEmail') || '';
  return `
    <hr class="hd-form-divider">
    <div class="hd-form-row">
      <div class="hd-form-group">
        <label>Your Name <span class="req">*</span></label>
        <input type="text" name="requester_name" placeholder="Full Name" required>
      </div>
      <div class="hd-form-group">
        <label>Phone No. <span class="req">*</span></label>
        <input type="tel" name="requester_phone" placeholder="9876543210" required>
      </div>
    </div>
    <div class="hd-form-group">
      <label>Email Address <span class="req">*</span></label>
      <input type="email" name="requester_email" value="${loginEmail}" readonly style="background: #f3f4f6; color: #4b5563; cursor: not-allowed;" required>
    </div>`;
}

function submitBtn(label = 'Submit Request') {
  return `<button type="submit" class="hd-submit-btn">${label}</button>`;
}

function renderForm(id) {
  switch (id) {

    case 'maintenance':
      return `<form id="hd-form" autocomplete="off">
        <div class="hd-form-group">
          <label>Issue Type <span class="req">*</span></label>
          <select name="subcategory" required>
            <option value="">— Select Issue —</option>
            <option>AC not working</option>
            <option>Light / Fan issue</option>
            <option>Electrical problem</option>
            <option>Plumbing issue</option>
            <option>Furniture repair</option>
            <option>Office equipment issue</option>
          </select>
        </div>
        <div class="hd-form-group">
          <label>Which Floor <span class="req">*</span></label>
          ${floorSelect()}
        </div>
        <div class="hd-form-group">
          <label>Exact Issue <span class="req">*</span></label>
          <textarea name="exact_issue" placeholder="Describe the problem in detail..." required></textarea>
        </div>
        <div class="hd-form-group">
          <label>Remarks</label>
          <textarea name="remarks" placeholder="Any additional information..."></textarea>
        </div>
        ${contactFields()}
        ${submitBtn()}
      </form>`;

    case 'housekeeping':
      return `<form id="hd-form" autocomplete="off">
        <div class="hd-form-group">
          <label>Request Type <span class="req">*</span></label>
          <select name="subcategory" required>
            <option value="">— Select Type —</option>
            <option>Cleaning request</option>
            <option>Waste removal</option>
          </select>
        </div>
        <div class="hd-form-group">
          <label>Which Floor <span class="req">*</span></label>
          ${floorSelect()}
        </div>
        <div class="hd-form-group">
          <label>Exact Query <span class="req">*</span></label>
          <textarea name="exact_issue" placeholder="Describe your request in detail..." required></textarea>
        </div>
        <div class="hd-form-group">
          <label>Remarks</label>
          <textarea name="remarks" placeholder="Any additional information..."></textarea>
        </div>
        ${contactFields()}
        ${submitBtn()}
      </form>`;

    case 'hk_material':
      return `<form id="hd-form" autocomplete="off">
        <div class="hd-form-group" style="position: relative;">
          <label>Select &amp; Search Items <span class="req">*</span></label>
          <!-- Trigger Box -->
          <div id="hk-dropdown-trigger" onclick="toggleHkDropdown(event)" style="display: flex; justify-content: space-between; align-items: center; padding: 0.7rem 0.9rem; border: 1.5px solid var(--border); border-radius: 8px; background: white; cursor: pointer; font-size: 0.9rem; font-family: inherit; user-select: none;">
            <span id="hk-dropdown-trigger-text" style="color: var(--text-muted);">— Select Items —</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">▼</span>
          </div>
          <!-- Dropdown Options List Panel -->
          <div id="hk-dropdown-options" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1.5px solid var(--border); border-radius: 8px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 0.6rem; margin-top: 4px;" onclick="event.stopPropagation()">
            <!-- Search Box Inside Dropdown -->
            <input type="text" id="hk-dropdown-search" placeholder="🔍 Search items..." style="width: 100%; padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none; margin-bottom: 0.5rem; background: #fff;">
            <!-- Options List with Checkboxes -->
            <div id="hk-options-list" style="max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px;">
              <!-- Injected dynamically by JS -->
            </div>
          </div>
        </div>

        <!-- Selected Items Cart Table -->
        <div class="hd-form-group" id="selected-hk-container" style="display: none; margin-bottom: 1.2rem;">
          <label>Selected Items &amp; Quantities</label>
          <div style="background: #f9fafb; border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem; max-height: 200px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted); font-size:0.8rem;">
                  <th style="padding: 0.4rem;">Item Name</th>
                  <th style="padding: 0.4rem; width: 100px; text-align: center;">Qty</th>
                  <th style="padding: 0.4rem; width: 40px; text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody id="selected-hk-tbody"></tbody>
            </table>
          </div>
        </div>

        <div class="hd-form-row">
          <div class="hd-form-group">
            <label>Which Floor <span class="req">*</span></label>
            ${floorSelect()}
          </div>
        </div>
        <div class="hd-form-group">
          <label>Remarks</label>
          <textarea name="remarks" placeholder="Any additional details or specifications..."></textarea>
        </div>
        ${contactFields()}
        ${submitBtn('Submit Housekeeping Material Request')}
      </form>`;

    case 'office_asset':
      return `<form id="hd-form" autocomplete="off">
        <div class="hd-form-group">
          <label>Request Type <span class="req">*</span></label>
          <select name="subcategory" required>
            <option value="">— Select Type —</option>
            <option>Chair / Table requirement</option>
            <option>New equipment request</option>
            <option>Replacement request</option>
          </select>
        </div>
        <div class="hd-form-group">
          <label>Which Floor <span class="req">*</span></label>
          ${floorSelect()}
        </div>
        <div class="hd-form-group">
          <label>Exact Query <span class="req">*</span></label>
          <textarea name="exact_issue" placeholder="Describe the asset needed..." required></textarea>
        </div>
        <div class="hd-form-group">
          <label>Remarks</label>
          <textarea name="remarks" placeholder="Any additional information..."></textarea>
        </div>
        ${contactFields()}
        ${submitBtn()}
      </form>`;

    case 'print_scan':
      return `<form id="hd-form" autocomplete="off">
        <div class="hd-form-group">
          <label>Service Type <span class="req">*</span></label>
          <select name="subcategory" required>
            <option value="">— Select Service —</option>
            <option>Bulk printing</option>
            <option>Scanning</option>
            <option>Binding / Lamination</option>
          </select>
        </div>
        <div class="hd-form-group">
          <label>Exact Query <span class="req">*</span></label>
          <textarea name="exact_issue" placeholder="Describe your requirement (quantity, paper size, etc.)..." required></textarea>
        </div>
        <div class="hd-form-group">
          <label>Remarks</label>
          <textarea name="remarks" placeholder="Any additional instructions..."></textarea>
        </div>
        ${contactFields()}
        ${submitBtn()}
      </form>`;

    case 'stationery':
      return `<form id="hd-form" autocomplete="off">
        <div class="hd-form-group">
          <label>Request Category <span class="req">*</span></label>
          <div class="hd-stationery-toggle">
            <button type="button" class="hd-toggle-btn active" data-type="printing">🖨️ Printing Items</button>
            <button type="button" class="hd-toggle-btn" data-type="stationery">📦 Stationery Items</button>
          </div>
        </div>
        
        <div class="hd-form-group" style="position: relative;">
          <label>Select & Search Items <span class="req">*</span></label>
          <!-- Trigger Box -->
          <div id="stationery-dropdown-trigger" onclick="toggleStationeryDropdown(event)" style="display: flex; justify-content: space-between; align-items: center; padding: 0.7rem 0.9rem; border: 1.5px solid var(--border); border-radius: 8px; background: white; cursor: pointer; font-size: 0.9rem; font-family: inherit; user-select: none;">
            <span id="stationery-dropdown-trigger-text" style="color: var(--text-muted);">— Select Items —</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">▼</span>
          </div>
          <!-- Dropdown Options List Panel -->
          <div id="stationery-dropdown-options" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1.5px solid var(--border); border-radius: 8px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 0.6rem; margin-top: 4px;" onclick="event.stopPropagation()">
            <!-- Search Box Inside Dropdown -->
            <input type="text" id="stationery-dropdown-search" placeholder="🔍 Search items in catalog..." style="width: 100%; padding: 0.5rem 0.7rem; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none; margin-bottom: 0.5rem; background: #fff;">
            <!-- Options List with Checkboxes -->
            <div id="stationery-options-list" style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px;">
              <!-- Injected dynamically by JS -->
            </div>
          </div>
        </div>

        <!-- Selected Items Cart Table -->
        <div class="hd-form-group" id="selected-stationery-container" style="display: none; margin-bottom: 1.2rem;">
          <label>Selected Items & Quantities</label>
          <div style="background: #f9fafb; border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem; max-height: 200px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted); font-size:0.8rem;">
                  <th style="padding: 0.4rem;">Item Name</th>
                  <th style="padding: 0.4rem; width: 100px; text-align: center;">Qty</th>
                  <th style="padding: 0.4rem; width: 40px; text-align: center;">Action</th>
                </tr>
              </thead>
              <tbody id="selected-stationery-tbody">
              </tbody>
            </table>
          </div>
        </div>

        <div class="hd-form-row">
          <div class="hd-form-group">
            <label>Which Floor <span class="req">*</span></label>
            ${floorSelect()}
          </div>
        </div>
        <div class="hd-form-group">
          <label>Remarks</label>
          <textarea name="remarks" placeholder="Any additional details..."></textarea>
        </div>
        ${contactFields()}
        ${submitBtn('Submit Stationery Request')}
      </form>`;

    case 'admin_support':
      return `<form id="hd-form" autocomplete="off">
        <div class="hd-form-group">
          <label>Support Type <span class="req">*</span></label>
          <select name="subcategory" required>
            <option value="">— Select Support Type —</option>
            <option>Safety Concern Reporting</option>
            <option>Pantry / Refreshment Request</option>
            <option>Courier / Dispatch Request</option>
            <option>Event / Celebration Support Request</option>
            <option>Lost & Found Report</option>
            <option>Feedback / Suggestions</option>
            <option>Other</option>
          </select>
        </div>
        <div class="hd-form-group">
          <label>Which Floor <span class="req">*</span></label>
          ${floorSelect()}
        </div>
        <div class="hd-form-group">
          <label>Description <span class="req">*</span></label>
          <textarea name="exact_issue" rows="4" placeholder="Describe your request or issue in detail..." required></textarea>
        </div>
        <div class="hd-form-group">
          <label>Remarks</label>
          <textarea name="remarks" placeholder="Any additional information..."></textarea>
        </div>
        ${contactFields()}
        ${submitBtn('Submit Support Request')}
      </form>`;

    default:
      return '<p>Unknown category.</p>';
  }
}

/* ── Stationery Custom Multiselect Dropdown & Cart Management ──────── */
let selectedStationeryItems = [];
let currentStationeryType = 'printing';

window.toggleStationeryDropdown = function(event) {
  event.stopPropagation();
  const options = document.getElementById('stationery-dropdown-options');
  if (!options) return;
  
  if (options.style.display === 'none' || !options.style.display) {
    options.style.display = 'block';
    const searchInput = document.getElementById('stationery-dropdown-search');
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    renderOptionsList();
  } else {
    options.style.display = 'none';
  }
};

window.toggleStationeryItem = function(itemName, checked) {
  if (checked) {
    if (!selectedStationeryItems.some(it => it.item === itemName)) {
      selectedStationeryItems.push({ item: itemName, quantity: 1 });
    }
  } else {
    selectedStationeryItems = selectedStationeryItems.filter(it => it.item !== itemName);
  }
  renderSelectedStationeryItems();
  updateTriggerText();
};

window.adjustItemQuantity = function(itemName, delta) {
  const existing = selectedStationeryItems.find(it => it.item === itemName);
  if (existing) {
    existing.quantity = Math.max(1, existing.quantity + delta);
  }
  renderSelectedStationeryItems();
};

window.removeSelectedStationeryItem = function(index) {
  const item = selectedStationeryItems[index];
  if (item) {
    selectedStationeryItems.splice(index, 1);
    // Uncheck in options list if it's currently rendered
    const checkboxes = document.querySelectorAll('#stationery-options-list input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.value === item.item) cb.checked = false;
    });
  }
  renderSelectedStationeryItems();
  updateTriggerText();
};

function updateTriggerText() {
  const triggerText = document.getElementById('stationery-dropdown-trigger-text');
  if (!triggerText) return;
  if (selectedStationeryItems.length === 0) {
    triggerText.textContent = '— Select Items —';
    triggerText.style.color = 'var(--text-muted)';
  } else {
    triggerText.textContent = `${selectedStationeryItems.length} item(s) selected`;
    triggerText.style.color = 'var(--text)';
  }
}

function renderSelectedStationeryItems() {
  const container = document.getElementById('selected-stationery-container');
  const tbody = document.getElementById('selected-stationery-tbody');
  if (!container || !tbody) return;

  if (selectedStationeryItems.length === 0) {
    container.style.display = 'none';
    tbody.innerHTML = '';
  } else {
    container.style.display = 'block';
    tbody.innerHTML = selectedStationeryItems.map((it, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 0.5rem 0.4rem; font-weight: 600; color: var(--text);">${it.item}</td>
        <td style="padding: 0.5rem 0.4rem; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <button type="button" onclick="adjustItemQuantity('${it.item}', -1)" style="padding: 0.15rem 0.45rem; background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: inherit; font-size: 0.8rem; line-height: 1;">-</button>
            <span style="font-weight: 700; min-width: 25px; text-align: center; font-size: 0.9rem; color: var(--text);">${it.quantity}</span>
            <button type="button" onclick="adjustItemQuantity('${it.item}', 1)" style="padding: 0.15rem 0.45rem; background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: inherit; font-size: 0.8rem; line-height: 1;">+</button>
          </div>
        </td>
        <td style="padding: 0.5rem 0.4rem; text-align: center;">
          <button type="button" onclick="removeSelectedStationeryItem(${idx})" style="background: none; border: none; color: #ef4444; font-size: 0.95rem; cursor: pointer;">❌</button>
        </td>
      </tr>
    `).join('');
  }

  const otherSelected = selectedStationeryItems.some(it => it.item === 'Other');
  let noteEl = document.getElementById('stationery-other-note');
  if (otherSelected) {
    if (!noteEl) {
      noteEl = document.createElement('div');
      noteEl.id = 'stationery-other-note';
      noteEl.style = 'margin-top: 0.8rem; font-size: 0.85rem; color: #dc2626; font-weight: 600; padding: 0.5rem; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px;';
      noteEl.innerHTML = '⚠️ Note: Please specify the exact name and details of the "Other" items requested in the Remarks box below!';
      container.appendChild(noteEl);
    }
  } else {
    if (noteEl) {
      noteEl.remove();
    }
  }
}

function renderOptionsList(filterText = '') {
  const listContainer = document.getElementById('stationery-options-list');
  if (!listContainer) return;

  const catalog = currentStationeryType === 'printing' ? STATIONERY_PRINTING_ITEMS : STATIONERY_ITEMS;
  const filtered = catalog.filter(it => it.toLowerCase().includes(filterText.toLowerCase()));

  if (filtered.length === 0) {
    listContainer.innerHTML = `<div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No items found</div>`;
    return;
  }

  listContainer.innerHTML = filtered.map(it => {
    const isChecked = selectedStationeryItems.some(sel => sel.item === it);
    return `
      <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.6rem; cursor: pointer; border-radius: 6px; font-size: 0.88rem; transition: background 0.15s ease;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" value="${it}" ${isChecked ? 'checked' : ''} onchange="toggleStationeryItem('${it}', this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
        <span style="color: var(--text);">${it}</span>
      </label>
    `;
  }).join('');
}

function setupStationeryDropdownHandlers() {
  const searchInput = document.getElementById('stationery-dropdown-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderOptionsList(e.target.value);
    });
  }

  // Close list when clicking outside
  document.addEventListener('click', (e) => {
    const trigger = document.getElementById('stationery-dropdown-trigger');
    const options = document.getElementById('stationery-dropdown-options');
    if (trigger && options) {
      if (!trigger.contains(e.target) && !options.contains(e.target)) {
        options.style.display = 'none';
      }
    }
  });
}

/* ── Housekeeping Material Multiselect Dropdown & Cart ──────── */
let selectedHkItems = [];

window.toggleHkDropdown = function(event) {
  event.stopPropagation();
  const options = document.getElementById('hk-dropdown-options');
  if (!options) return;
  if (options.style.display === 'none' || !options.style.display) {
    options.style.display = 'block';
    const searchInput = document.getElementById('hk-dropdown-search');
    if (searchInput) { searchInput.value = ''; searchInput.focus(); }
    renderHkOptionsList();
  } else {
    options.style.display = 'none';
  }
};

window.toggleHkItem = function(itemName, checked) {
  if (checked) {
    if (!selectedHkItems.some(it => it.item === itemName)) {
      selectedHkItems.push({ item: itemName, quantity: 1 });
    }
  } else {
    selectedHkItems = selectedHkItems.filter(it => it.item !== itemName);
  }
  renderSelectedHkItems();
  updateHkTriggerText();
};

window.adjustHkQuantity = function(itemName, delta) {
  const existing = selectedHkItems.find(it => it.item === itemName);
  if (existing) existing.quantity = Math.max(1, existing.quantity + delta);
  renderSelectedHkItems();
};

window.removeSelectedHkItem = function(index) {
  const item = selectedHkItems[index];
  if (item) {
    selectedHkItems.splice(index, 1);
    document.querySelectorAll('#hk-options-list input[type="checkbox"]').forEach(cb => {
      if (cb.value === item.item) cb.checked = false;
    });
  }
  renderSelectedHkItems();
  updateHkTriggerText();
};

function updateHkTriggerText() {
  const triggerText = document.getElementById('hk-dropdown-trigger-text');
  if (!triggerText) return;
  if (selectedHkItems.length === 0) {
    triggerText.textContent = '— Select Items —';
    triggerText.style.color = 'var(--text-muted)';
  } else {
    triggerText.textContent = `${selectedHkItems.length} item(s) selected`;
    triggerText.style.color = 'var(--text)';
  }
}

function renderSelectedHkItems() {
  const container = document.getElementById('selected-hk-container');
  const tbody = document.getElementById('selected-hk-tbody');
  if (!container || !tbody) return;

  if (selectedHkItems.length === 0) {
    container.style.display = 'none';
    tbody.innerHTML = '';
  } else {
    container.style.display = 'block';
    tbody.innerHTML = selectedHkItems.map((it, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 0.5rem 0.4rem; font-weight: 600; color: var(--text);">${it.item}</td>
        <td style="padding: 0.5rem 0.4rem; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <button type="button" onclick="adjustHkQuantity('${it.item}', -1)" style="padding: 0.15rem 0.45rem; background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: inherit; font-size: 0.8rem; line-height: 1;">-</button>
            <span style="font-weight: 700; min-width: 25px; text-align: center; font-size: 0.9rem; color: var(--text);">${it.quantity}</span>
            <button type="button" onclick="adjustHkQuantity('${it.item}', 1)" style="padding: 0.15rem 0.45rem; background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: inherit; font-size: 0.8rem; line-height: 1;">+</button>
          </div>
        </td>
        <td style="padding: 0.5rem 0.4rem; text-align: center;">
          <button type="button" onclick="removeSelectedHkItem(${idx})" style="background: none; border: none; color: #ef4444; font-size: 0.95rem; cursor: pointer;">❌</button>
        </td>
      </tr>
    `).join('');
  }

  const otherSelected = selectedHkItems.some(it => it.item === 'Other');
  let noteEl = document.getElementById('hk-other-note');
  if (otherSelected) {
    if (!noteEl) {
      noteEl = document.createElement('div');
      noteEl.id = 'hk-other-note';
      noteEl.style = 'margin-top: 0.8rem; font-size: 0.85rem; color: #dc2626; font-weight: 600; padding: 0.5rem; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px;';
      noteEl.innerHTML = '⚠️ Note: Please specify the exact name and details of the "Other" items requested in the Remarks box below!';
      container.appendChild(noteEl);
    }
  } else {
    if (noteEl) noteEl.remove();
  }
}

function renderHkOptionsList(filterText = '') {
  const listContainer = document.getElementById('hk-options-list');
  if (!listContainer) return;

  const filtered = HK_MATERIAL_ITEMS.filter(it => it.toLowerCase().includes((filterText || '').toLowerCase()));
  if (filtered.length === 0) {
    listContainer.innerHTML = `<div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No items found</div>`;
    return;
  }

  listContainer.innerHTML = filtered.map(it => {
    const isChecked = selectedHkItems.some(sel => sel.item === it);
    return `
      <label style="display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.6rem; cursor: pointer; border-radius: 6px; font-size: 0.88rem; transition: background 0.15s ease;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" value="${it}" ${isChecked ? 'checked' : ''} onchange="toggleHkItem('${it}', this.checked)" style="width: 16px; height: 16px; cursor: pointer;">
        <span style="color: var(--text);">${it}</span>
      </label>
    `;
  }).join('');
}

function setupHkDropdownHandlers() {
  const searchInput = document.getElementById('hk-dropdown-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => renderHkOptionsList(e.target.value));
  }
  document.addEventListener('click', (e) => {
    const trigger = document.getElementById('hk-dropdown-trigger');
    const options = document.getElementById('hk-dropdown-options');
    if (trigger && options) {
      if (!trigger.contains(e.target) && !options.contains(e.target)) {
        options.style.display = 'none';
      }
    }
  });
}

function updateStationeryItems(type) {
  currentStationeryType = type;
  selectedStationeryItems = [];
  renderSelectedStationeryItems();
  updateTriggerText();

  renderOptionsList();
  setupStationeryDropdownHandlers();

  // Store current type in hidden input for submission
  let typeInput = document.querySelector('input[name="stationery_type"]');
  if (!typeInput) {
    typeInput = document.createElement('input');
    typeInput.type = 'hidden';
    typeInput.name = 'stationery_type';
    const form = document.getElementById('hd-form');
    if (form) form.appendChild(typeInput);
  }
  if (typeInput) {
    typeInput.value = type === 'printing' ? 'Printing Item' : 'Stationery Item';
  }
}

/* ── Form Submission ─────────────────────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.hd-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  const formData = new FormData(form);
  const payload = {
    category: currentCategory.id,
    categoryTitle: currentCategory.title,
    submittedAt: new Date().toISOString(),
    requester_email: sessionStorage.getItem('employeeOutlookEmail') || ''
  };
  formData.forEach((val, key) => { payload[key] = val; });

  if (currentCategory.id === 'stationery') {
    if (selectedStationeryItems.length === 0) {
      showToast('Please add at least one stationery item to your list.', 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Request';
      return;
    }
    payload.items = selectedStationeryItems;
    payload.item = selectedStationeryItems.map(it => `${it.item} (${it.quantity})`).join(', ');
    payload.quantity = selectedStationeryItems.reduce((acc, it) => acc + it.quantity, 0);
  }

  if (currentCategory.id === 'hk_material') {
    if (selectedHkItems.length === 0) {
      showToast('Please add at least one housekeeping item to your list.', 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Request';
      return;
    }
    payload.items = selectedHkItems;
    payload.item = selectedHkItems.map(it => `${it.item} (${it.quantity})`).join(', ');
    payload.quantity = selectedHkItems.reduce((acc, it) => acc + it.quantity, 0);
  }

  try {
    const res = await fetch('/api/helpdesk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showSuccess();
    } else {
      const data = await res.json();
      showToast(data.error || 'Submission failed. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Request';
    }
  } catch (err) {
    showToast('Connection error. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = 'Submit Request';
  }
}

function showSuccess() {
  document.getElementById('hd-modal-body').innerHTML = `
    <div class="hd-success">
      <div class="hd-success-icon">✅</div>
      <h3>Request Submitted!</h3>
      <p>Your request has been recorded. The Admin team will get back to you shortly.</p>
      <button class="hd-success-back" onclick="closeModal()">← Back to Home</button>
    </div>`;
  showToast('Request submitted successfully!', 'success');
}

/* ── Toast ───────────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('active'), 10);
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await fetchStationeryCatalog();
  buildCards();

  document.getElementById('hd-modal-close').addEventListener('click', closeModal);
  document.getElementById('hd-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('hd-overlay')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

/* ── Chatbot CSS injection ── */
const chatStyle = document.createElement('style');
chatStyle.innerHTML = `
  .hk-bot-bubble {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #4f46e5, #0ea5e9);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 28px;
    box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
    cursor: pointer;
    z-index: 1000;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    animation: hk-bounce 2s infinite;
  }
  .hk-bot-bubble:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 15px 30px -5px rgba(79, 70, 229, 0.6);
  }
  @keyframes hk-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  .hk-chat-window {
    position: fixed;
    bottom: 96px;
    right: 24px;
    width: 380px;
    height: 520px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(241, 245, 249, 0.8);
    border-radius: 20px;
    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.15);
    display: none;
    flex-direction: column;
    overflow: hidden;
    z-index: 1000;
    transition: all 0.3s ease;
    transform: translateY(20px);
    opacity: 0;
  }
  .hk-chat-window.active {
    display: flex;
    transform: translateY(0);
    opacity: 1;
  }
  
  .hk-chat-header {
    background: linear-gradient(135deg, #1e1b4b, #312e81);
    color: white;
    padding: 1.2rem;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }
  .hk-chat-header .title {
    font-weight: 700;
    font-size: 1.05rem;
  }
  .hk-chat-header .status {
    font-size: 0.75rem;
    color: #34d399;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .hk-chat-header .status::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #34d399;
    border-radius: 50%;
    display: inline-block;
  }
  .hk-chat-header .close-btn {
    margin-left: auto;
    cursor: pointer;
    font-size: 1.5rem;
    opacity: 0.8;
    transition: opacity 0.2s;
    line-height: 1;
  }
  .hk-chat-header .close-btn:hover {
    opacity: 1;
  }
  
  .hk-chat-body {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #f8fafc;
  }
  .hk-message {
    max-width: 85%;
    padding: 0.8rem 1rem;
    border-radius: 16px;
    font-size: 0.88rem;
    line-height: 1.4;
  }
  .hk-message.bot {
    background: white;
    color: #1e293b;
    align-self: flex-start;
    border-bottom-left-radius: 4px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  }
  .hk-message.user {
    background: #4f46e5;
    color: white;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }
  
  .hk-chat-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
  }
  .hk-chat-action-btn {
    background: #f1f5f9;
    color: #4f46e5;
    border: 1px solid #e2e8f0;
    padding: 0.5rem 0.8rem;
    border-radius: 10px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
  }
  .hk-chat-action-btn:hover {
    background: #e2e8f0;
    transform: translateX(3px);
  }
  
  .hk-chat-footer {
    padding: 0.8rem 1rem;
    background: white;
    border-top: 1px solid #f1f5f9;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .hk-chat-input {
    flex: 1;
    padding: 0.6rem 0.8rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    outline: none;
    font-family: inherit;
    font-size: 0.88rem;
    transition: border-color 0.2s;
  }
  .hk-chat-input:focus {
    border-color: #4f46e5;
  }
  .hk-chat-send-btn {
    background: #4f46e5;
    color: white;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.1rem;
    transition: background 0.2s;
  }
  .hk-chat-send-btn:hover {
    background: #3730a3;
  }
`;
document.head.appendChild(chatStyle);

/* ── Chatbot DOM & Event Handlers ── */
function toggleChatWindow() {
  const widget = document.getElementById('hk-chat-window-widget');
  const tag = document.getElementById('hk-bot-tooltip-tag');
  if (widget) {
    widget.classList.toggle('active');
    if (tag) {
      tag.style.display = widget.classList.contains('active') ? 'none' : 'block';
    }
  }
}

function sendBotWelcome() {
  const container = document.getElementById('hk-chat-messages-container');
  if (!container) return;
  const msg = document.createElement('div');
  msg.className = 'hk-message bot';
  msg.innerHTML = `
    Hi! I'm your Admin support assistant. Please describe the issue you are experiencing, and I will recommend the correct category and guide you on how to submit the request.
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function appendUserBubble(txt) {
  const container = document.getElementById('hk-chat-messages-container');
  if (!container) return;
  const msg = document.createElement('div');
  msg.className = 'hk-message user';
  msg.textContent = txt;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function openFormFromBot(catId) {
  toggleChatWindow();
  const cat = CATEGORIES.find(c => c.id === catId);
  if (cat) {
    if (cat.link) {
      window.location.href = cat.link;
    } else {
      openModal(cat);
    }
  }
}

function handleChatKeyDown(e) {
  if (e.key === 'Enter') {
    sendUserMessage();
  }
}

function sendUserMessage() {
  const input = document.getElementById('hk-chat-text-input');
  if (!input) return;
  const txt = input.value.trim();
  if (!txt) return;
  
  appendUserBubble(txt);
  input.value = '';
  
  setTimeout(() => {
    const container = document.getElementById('hk-chat-messages-container');
    if (!container) return;
    const reply = document.createElement('div');
    reply.className = 'hk-message bot';
    
    const q = txt.toLowerCase();
    
    let html = '';

    if (q.includes('ac') || q.includes('fan') || q.includes('light') || q.includes('leak') || q.includes('plumbing') || q.includes('plumber') || q.includes('water') || q.includes('tap') || q.includes('pipe') || q.includes('clog') || q.includes('flush') || q.includes('basin') || q.includes('sink') || q.includes('drain') || q.includes('carpenter') || q.includes('door') || q.includes('furniture') || q.includes('repair') || q.includes('maintenance')) {
      html = `
        I recommend submitting a **Maintenance Complaint** (covering plumbing, electrical, AC, and door issues). 
        <br><br>
        **How to raise this request:**
        1. Click the button below to open the form.
        2. Pick the **Issue Type** (e.g. *Plumbing Issue*, *Electrical Issue*, *AC Issue*, or *Furniture/Door Issue*).
        3. Select your **Floor** and enter your **Cabin/Room No**.
        4. Add comments describing the issue and click **Submit Request**.
        <div class="hk-chat-actions">
          <button class="hk-chat-action-btn" onclick="openFormFromBot('maintenance')">👉 Open Maintenance Form</button>
        </div>
      `;
    } else if (q.includes('clean') || q.includes('floor') || q.includes('spill') || q.includes('dust') || q.includes('trash') || q.includes('waste') || q.includes('housekeeping') || q.includes('dirty') || q.includes('washroom') || q.includes('toilet') || q.includes('bathroom')) {
      html = `
        I recommend submitting a **Housekeeping Request** (covering cleaning and waste removal). 
        <br><br>
        **How to raise this request:**
        1. Click the button below to open the form.
        2. Select your **Floor** and enter your **Cabin/Room No**.
        3. Describe your request (e.g., *“Washroom needs cleaning”* or *“Spill on 2nd floor corridor”*).
        4. Click **Submit Request**.
        <div class="hk-chat-actions">
          <button class="hk-chat-action-btn" onclick="openFormFromBot('housekeeping')">👉 Open Housekeeping Form</button>
        </div>
      `;
    } else if (q.includes('pen') || q.includes('paper') || q.includes('stationery') || q.includes('notebook') || q.includes('pencil') || q.includes('stapler') || q.includes('marker') || q.includes('ruler') || q.includes('eraser')) {
      html = `
        I recommend submitting a **Stationery Request** (covering general office supplies).
        <br><br>
        **How to raise this request:**
        1. Click the button below to open the form.
        2. Toggle between **Stationery Items** or **Printing Items** tabs.
        3. Find the item you need from the list.
        4. Enter the **Quantity** and click **Submit Request**.
        <div class="hk-chat-actions">
          <button class="hk-chat-action-btn" onclick="openFormFromBot('stationery')">👉 Open Stationery Form</button>
        </div>
      `;
    } else if (q.includes('print') || q.includes('scan') || q.includes('copy') || q.includes('xerox') || q.includes('binding') || q.includes('lamination') || q.includes('bulk')) {
      html = `
        I recommend submitting a **Printing & Scanning** request (covering bulk copy/lamination).
        <br><br>
        **How to raise this request:**
        1. Click the button below to open the form.
        2. Select the **Service Type** (e.g., *Bulk printing*, *Scanning*, *Lamination*, or *Binding*).
        3. Select your **Floor** and enter your **Cabin/Room No**.
        4. Add specifications (e.g., number of pages, color vs black-and-white) and click **Submit Request**.
        <div class="hk-chat-actions">
          <button class="hk-chat-action-btn" onclick="openFormFromBot('print_scan')">👉 Open Printing & Scanning Form</button>
        </div>
      `;
    } else if (q.includes('asset') || q.includes('equipment') || q.includes('laptop') || q.includes('mouse') || q.includes('keyboard') || q.includes('monitor') || q.includes('desktop') || q.includes('pc') || q.includes('computer') || q.includes('replacement')) {
      html = `
        I recommend submitting an **Office Asset Request** (covering furniture, IT equipment, or device replacement).
        <br><br>
        **How to raise this request:**
        1. Click the button below to open the form.
        2. Specify the asset you require (e.g., *Laptop*, *Chair*, *External Monitor*).
        3. Select your **Floor** and enter your **Cabin/Room No**.
        4. Provide details or justification in the remarks and click **Submit Request**.
        <div class="hk-chat-actions">
          <button class="hk-chat-action-btn" onclick="openFormFromBot('office_asset')">👉 Open Office Asset Form</button>
        </div>
      `;
    } else if (q.includes('room') || q.includes('book') || q.includes('meeting') || q.includes('conference') || q.includes('hall') || q.includes('schedule')) {
      html = `
        I recommend using the **Conference Room Booking** portal.
        <br><br>
        **How to reserve a slot:**
        1. Click the button below to load the calendar schedule.
        2. Choose your slot's date, starting time, and ending time.
        3. Fill in the Booking Reason and the list of attendees.
        4. Click **Submit Booking**.
        <div class="hk-chat-actions">
          <button class="hk-chat-action-btn" onclick="openFormFromBot('conference')">👉 Book Conference Room</button>
        </div>
      `;
    } else if (q.includes('admin') || q.includes('hr') || q.includes('letter') || q.includes('id') || q.includes('card') || q.includes('support') || q.includes('attendance')) {
      html = `
        I recommend submitting an **Admin Support** request.
        <br><br>
        **How to raise this request:**
        1. Click the button below to open the form.
        2. Choose the type of support (e.g., *ID Card Reissue*, *Shift Change*, *Letters*, or *Other Support*).
        3. Provide details/remarks explaining your query.
        4. Click **Submit Request**.
        <div class="hk-chat-actions">
          <button class="hk-chat-action-btn" onclick="openFormFromBot('admin_support')">👉 Open Admin Support Form</button>
        </div>
      `;
    } else {
      html = `
        I'm sorry, I couldn't match that query to a specific service category. Please reach out to our admin support team directly for further assistance:
        <div style="margin-top: 8px; font-weight: 600;">
          📞 Contact your IT / Admin support team<br>
          ✉️ Raise a ticket using the <button class="hk-chat-action-btn" onclick="openFormFromBot('admin_support')" style="margin-top:6px;display:inline-block;">👉 Admin Support Form</button>
        </div>
      `;
    }
    
    // Parse markdown **bold** and *italic*
    reply.innerHTML = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    container.appendChild(reply);
    container.scrollTop = container.scrollHeight;
  }, 400);
}

function initHelpDeskChatbot() {
  // Inject tooltip styles
  const tooltipStyle = document.createElement('style');
  tooltipStyle.innerHTML = `
    .hk-bot-tooltip {
      position: fixed;
      bottom: 34px;
      right: 96px;
      background: #1e1b4b;
      color: white;
      padding: 8px 14px;
      border-radius: 12px;
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 4px 15px rgba(0,0,0,0.15);
      z-index: 999;
      pointer-events: none;
      animation: hk-tooltip-fade 2s infinite alternate;
      transition: opacity 0.3s;
    }
    .hk-bot-tooltip::after {
      content: '';
      position: absolute;
      right: -6px;
      top: 50%;
      transform: translateY(-50%);
      border-width: 6px 0 6px 6px;
      border-style: solid;
      border-color: transparent transparent transparent #1e1b4b;
    }
    @keyframes hk-tooltip-fade {
      0% { transform: scale(1); }
      100% { transform: scale(1.03); }
    }
  `;
  document.head.appendChild(tooltipStyle);

  // 1. Create floating bubble button
  const bubble = document.createElement('button');
  bubble.className = 'hk-bot-bubble';
  bubble.id = 'hk-bot-bubble-btn';
  bubble.setAttribute('aria-label', 'Open Admin Support Assistant');
  bubble.innerHTML = '🤖';
  document.body.appendChild(bubble);

  // Create Tag speech bubble next to it
  const tag = document.createElement('div');
  tag.className = 'hk-bot-tooltip';
  tag.id = 'hk-bot-tooltip-tag';
  tag.innerHTML = 'How can I help you Today!';
  document.body.appendChild(tag);
  
  // 2. Create Chat Window
  const windowDiv = document.createElement('div');
  windowDiv.className = 'hk-chat-window';
  windowDiv.id = 'hk-chat-window-widget';
  windowDiv.innerHTML = `
    <div class="hk-chat-header">
      <span style="font-size: 1.3rem;">🤖</span>
      <div>
        <div class="title" style="margin: 0; line-height: 1.2;">Admin support assistant</div>
        <div class="status">Online</div>
      </div>
      <div class="close-btn" role="button" tabindex="0" aria-label="Close chat window" onclick="toggleChatWindow()" onkeydown="if(event.key==='Enter'||event.key===' ') toggleChatWindow()">&times;</div>
    </div>
    <div class="hk-chat-body" id="hk-chat-messages-container"></div>
    <div class="hk-chat-footer">
      <input type="text" id="hk-chat-text-input" class="hk-chat-input" placeholder="Type a message..." onkeydown="handleChatKeyDown(event)">
      <button class="hk-chat-send-btn" onclick="sendUserMessage()">⚡</button>
    </div>
  `;
  document.body.appendChild(windowDiv);

  // Bind toggle action to bubble click
  bubble.addEventListener('click', toggleChatWindow);
  
  // 3. Initial welcome message
  sendBotWelcome();
}

// Expose handlers to window scope so inline html onclick attributes compile without ReferenceError
window.toggleChatWindow = toggleChatWindow;
window.sendUserMessage = sendUserMessage;
window.handleChatKeyDown = handleChatKeyDown;
window.openFormFromBot = openFormFromBot;
