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
  },
  {
    id: 'courier_dispatch',
    title: 'Courier & Dispatch',
    icon: '📦',
    desc: 'Generate Delivery Challan (DC) and request courier dispatch services',
    accent: '#f97316',
    iconBg: '#ffedd5',
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

  if (cat.id === 'courier_dispatch') {
    try {
      const res = await fetch('/api/employee/courier-dispatch/next-dc');
      if (res.ok) {
        const data = await res.json();
        const input = document.getElementById('cd-dc-no');
        if (input) input.value = data.dcNo;
      }
    } catch (e) {
      console.error(e);
    }
    const dateInput = document.getElementById('cd-dc-date');
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    addCDItemRow();
    addCDBoxRow();
    loadCDSavedAddresses();
    if (window.onCDDateChange) {
      window.onCDDateChange();
    }
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

    case 'courier_dispatch':
      return `<form id="hd-form" autocomplete="off">
        <div class="hd-form-row">
          <div class="hd-form-group">
            <label>Delivery Challan No <span class="req">*</span></label>
            <input type="text" id="cd-dc-no" name="dcNo" style="font-weight: bold; width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;" required>
          </div>
          <div class="hd-form-group">
            <label>Delivery Challan Date <span class="req">*</span></label>
            <input type="date" id="cd-dc-date" name="dcDate" onchange="onCDDateChange()" required style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
          </div>
        </div>

        <div class="hd-form-row">
          <div class="hd-form-group">
            <label>Remarks <span class="req">*</span></label>
            <select id="cd-remarks-type" name="remarksType" onchange="onCDRemarksChange()" required style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
              <option value="">— Select Remarks —</option>
              <option value="Stationery">Stationery</option>
              <option value="Glass item">Glass item</option>
              <option value="Service">Service</option>
              <option value="Demo">Demo</option>
              <option value="Others">Others (Specify)</option>
            </select>
            <div id="cd-remarks-other-container" style="display:none; margin-top:0.5rem;">
              <input type="text" id="cd-remarks-other" name="remarksOther" placeholder="Specify other remarks..." style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
            </div>
          </div>
          <div class="hd-form-group">
            <label>Transporter Name <span class="req">*</span></label>
            <select id="cd-transporter-select" name="transporterSelect" onchange="onCDTransporterChange()" required style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
              <option value="">— Select Transporter —</option>
              <option value="Dexpress">Dexpress</option>
              <option value="Other">Other (Specify)</option>
            </select>
            <div id="cd-transporter-other-container" style="display:none; margin-top:0.5rem;">
              <input type="text" id="cd-transporter-name" name="transporterName" placeholder="Enter transporter name..." style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
            </div>
            <div id="cd-transporter-amount-container" style="display:none; margin-top:0.5rem;">
              <label style="font-size:0.8rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.25rem;">Transporter Amount (Optional)</label>
              <input type="number" id="cd-transporter-amount" name="transporterAmount" placeholder="e.g. 150" min="0" step="any" style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
            </div>
          </div>
        </div>

        <div id="cd-merge-dispatches-container" style="display:none; margin-top:0.5rem; margin-bottom:1.5rem; background:#fffbeb; border:1.5px solid #fde68a; border-radius:12px; padding:1.2rem; box-sizing:border-box;">
          <h4 style="font-size:0.92rem; font-weight:700; color:#b45309; margin-top:0; margin-bottom:0.4rem; display:flex; align-items:center; gap:0.4rem;">📦 Other Courier Dispatches on this Date</h4>
          <p style="font-size:0.8rem; color:#b45309; margin-bottom:1rem; line-height:1.4; margin-top:0;">You can request to merge your parcel request into one of these existing Delivery Challans to go together.</p>
          <div id="cd-merge-dispatches-list" style="display:flex; flex-direction:column; gap:0.75rem;"></div>
        </div>

        <div class="hd-form-row">
          <div class="hd-form-group">
            <label>No. of Boxes <span class="req">*</span></label>
            <input type="number" name="noOfBoxes" min="1" value="1" required style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
          </div>
          <div class="hd-form-group">
            <label>Courier Billing <span class="req">*</span></label>
            <select name="courierBilling" required style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
              <option value="">— Select Billing Entity —</option>
              <option value="Avana Medical Devices Pvt Ltd">Avana Medical Devices Pvt Ltd</option>
              <option value="Avana Surgical Systems Pvt Ltd">Avana Surgical Systems Pvt Ltd</option>
              <option value="Avana Technology Services Pvt Ltd">Avana Technology Services Pvt Ltd</option>
            </select>
          </div>
        </div>

        <div class="hd-form-group">
          <label>From Address <span class="req">*</span></label>
          <select id="cd-from-address-id" name="fromAddressId" onchange="onCDFromAddressChange()" required style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
            <option value="">— Select From Address —</option>
            <option value="1">Avana Medical Devices Pvt Ltd (Nandambakkam)</option>
            <option value="2">Avana Surgical Systems Pvt Ltd (Nandambakkam)</option>
            <option value="3">Avana Technology Services Pvt Ltd (Nandambakkam)</option>
            <option value="Other">Other Address (Specify)</option>
          </select>
          <div id="cd-from-address-other-container" style="display:none; margin-top:0.5rem;">
            <textarea id="cd-from-address-other" name="fromAddressOther" rows="3" placeholder="Enter custom From address details..." oninput="onCDFromAddressChange()" style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem; resize:vertical;"></textarea>
          </div>
          <div id="cd-from-address-preview" style="background:#f8fafc; border:1.5px solid var(--border); border-radius:8px; padding:0.75rem; font-size:0.85rem; color:#475569; margin-top:0.5rem; display:none; white-space:pre-line; line-height:1.4;"></div>
          <input type="hidden" id="cd-from-address-text" name="fromAddressText">
        </div>

        <div class="hd-form-row">
          <div class="hd-form-group">
            <label>Sender Name <span class="req">*</span></label>
            <input type="text" name="senderName" required placeholder="e.g. Karthick" style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
          </div>
          <div class="hd-form-group">
            <label>Sender Phone <span class="req">*</span></label>
            <input type="tel" name="senderPhone" required placeholder="e.g. 8925531209" style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
          </div>
        </div>

        <div class="hd-form-group">
          <label>To Address <span class="req">*</span></label>
          <select id="cd-to-address-select" name="toAddressSelect" onchange="onCDToAddressChange()" required style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
            <option value="">— Select To Address —</option>
            <option value="1">Avana Medical Devices Pvt Ltd (Bengaluru)</option>
            <option value="2">Avana Medical Devices Pvt Ltd (Mumbai)</option>
            <option value="3">Avana Medical Devices Pvt Ltd (New Delhi)</option>
            <option value="Other">Other Address (Specify)</option>
          </select>
          <div id="cd-to-address-container" style="margin-top:0.5rem;">
            <textarea id="cd-to-address" name="toAddress" rows="3" placeholder="Enter delivery address details (company, street, city, pincode)..." required style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem; resize:vertical;"></textarea>
          </div>
        </div>

        <div class="hd-form-row">
          <div class="hd-form-group">
            <label>Receiver Name <span class="req">*</span></label>
            <input type="text" name="receiverName" required placeholder="e.g. Prince" style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
          </div>
          <div class="hd-form-group">
            <label>Receiver Phone <span class="req">*</span></label>
            <input type="tel" name="receiverPhone" required placeholder="e.g. 9195404 41185" style="width:100%; box-sizing:border-box; padding:0.55rem 0.75rem; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.9rem;">
          </div>
        </div>

        <div style="margin-top:1.5rem; margin-bottom:1.5rem;">
          <label style="font-weight:700; display:block; margin-bottom:0.5rem; color:var(--text);">📦 Item Details</label>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; min-width:550px;">
              <thead>
                <tr style="border-bottom:2px solid var(--border); text-align:left; font-size:0.8rem; text-transform:uppercase; color:var(--text-muted);">
                  <th style="padding:0.4rem; width:22%;">Item Code</th>
                  <th style="padding:0.4rem; width:35%;">Item Description <span class="req">*</span></th>
                  <th style="padding:0.4rem; width:18%;">Serial No</th>
                  <th style="padding:0.4rem; width:7%; text-align:center;">Qty</th>
                  <th style="padding:0.4rem; width:8%; text-align:center;">Rate</th>
                  <th style="padding:0.4rem; width:10%; text-align:right;">Value</th>
                  <th style="padding:0.4rem; width:5%;"></th>
                </tr>
              </thead>
              <tbody id="cd-items-tbody"></tbody>
            </table>
          </div>
          <button type="button" onclick="addCDItemRow()" style="margin-top:0.6rem; background:#f0f9ff; color:#0284c7; border:1.5px dashed #bae6fd; border-radius:6px; padding:0.45rem 0.95rem; font-size:0.82rem; font-weight:600; cursor:pointer;">➕ Add Item</button>
        </div>

        <div style="display:flex; justify-content:flex-end; align-items:center; gap:0.8rem; margin-bottom:1.2rem; border-top:1px solid #f1f5f9; padding-top:0.8rem;">
          <span style="font-weight:700; color:#475569; font-size:0.88rem;">Total Amount:</span>
          <span id="cd-total-display" style="font-size:1.15rem; font-weight:800; color:#16a34a;">₹ 0.00</span>
          <input type="hidden" id="cd-total-input" name="totalAmount" value="0">
        </div>

        <div style="margin-top:1.5rem; margin-bottom:1.5rem; border-top:1px solid #f1f5f9; padding-top:1rem;">
          <label style="font-weight:700; display:block; margin-bottom:0.5rem; color:var(--text);">📦 Box Details (Dimensions & Weight)</label>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:2px solid var(--border); text-align:left; font-size:0.8rem; text-transform:uppercase; color:var(--text-muted);">
                  <th style="padding:0.4rem; width:15%;">Box No</th>
                  <th style="padding:0.4rem; width:45%;">Dimensions (optional)</th>
                  <th style="padding:0.4rem; width:35%;">Weight (optional)</th>
                  <th style="padding:0.4rem; width:5%;"></th>
                </tr>
              </thead>
              <tbody id="cd-boxes-tbody"></tbody>
            </table>
          </div>
          <button type="button" onclick="addCDBoxRow()" style="margin-top:0.6rem; background:#f0f9ff; color:#0284c7; border:1.5px dashed #bae6fd; border-radius:6px; padding:0.45rem 0.95rem; font-size:0.82rem; font-weight:600; cursor:pointer;">➕ Add Box Details</button>
        </div>

        <div style="margin-top:1.2rem; margin-bottom:1.2rem; background:#f8fafc; border:1.5px solid var(--border); border-radius:8px; padding:0.8rem 1rem;">
          <label style="display:flex; align-items:flex-start; gap:0.6rem; cursor:pointer; font-size:0.85rem; color:var(--text); font-weight:600; line-height:1.4;">
            <input type="checkbox" id="cd-include-declaration" name="includeDeclaration" checked style="width:17px; height:17px; margin-top:2px; accent-color:#0284c7;">
            <span>Include Demo Declaration line in DC Copy PDF<br>
            <span style="font-size:0.78rem; font-weight:400; color:var(--text-muted);">"Declaration: This is to confirm that goods containing in the parcel are surgical goods used for Demo purpose Not for Sale. Value declared is for only transport purpose."</span></span>
          </label>
        </div>

        ${contactFields()}
        ${submitBtn('Submit Dispatch Request')}
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

window.updateItemQuantityDirectly = function(itemName, val, finalise = false) {
  let parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed < 1) {
    if (finalise) parsed = 1;
    else return;
  }
  const existing = selectedStationeryItems.find(it => it.item === itemName);
  if (existing) {
    existing.quantity = parsed;
    updateTriggerText();
  }
  if (finalise) {
    renderSelectedStationeryItems();
  }
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
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.3rem;">
            <button type="button" onclick="adjustItemQuantity('${it.item}', -1)" style="padding: 0.15rem 0.45rem; background: #e2e8f0; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: inherit; font-size: 0.8rem; line-height: 1;">-</button>
            <input type="number" min="1" value="${it.quantity}" oninput="updateItemQuantityDirectly('${it.item}', this.value, false)" onchange="updateItemQuantityDirectly('${it.item}', this.value, true)" style="width: 55px; text-align: center; padding: 0.2rem 0.1rem; border: 1.5px solid var(--border); border-radius: 5px; font-weight: 700; font-size: 0.86rem; font-family: inherit; outline: none; box-sizing: border-box;">
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

  if (currentCategory.id === 'courier_dispatch') {
    // Resolve transporter selection
    if (payload.transporterSelect === 'Other') {
      payload.transporterName = (document.getElementById('cd-transporter-name').value || '').trim();
    } else {
      payload.transporterName = payload.transporterSelect || '';
    }
    
    payload.transporterAmount = parseFloat(document.getElementById('cd-transporter-amount').value) || null;

    // Resolve From address
    if (payload.fromAddressId === 'Other') {
      payload.fromAddressText = (document.getElementById('cd-from-address-other').value || '').trim();
    }

    const items = [];
    let isValid = true;
    document.querySelectorAll('#cd-items-tbody tr').forEach(tr => {
      const itemCode = (tr.querySelector('.cd-item-code')?.value || '').trim();
      const desc = (tr.querySelector('.cd-item-desc')?.value || '').trim();
      const serialNo = (tr.querySelector('.cd-item-serial')?.value || '').trim();
      const qty = parseInt(tr.querySelector('.cd-item-qty')?.value, 10) || 0;
      const rate = parseFloat(tr.querySelector('.cd-item-rate')?.value) || 0;
      const value = qty * rate;
      if (desc) {
        items.push({ itemCode, description: desc, serialNo, qty, rate, value });
      } else {
        isValid = false;
      }
    });

    if (!isValid || items.length === 0) {
      showToast('Please fill out descriptions for all items in the list.', 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Dispatch Request';
      return;
    }

    const boxes = [];
    document.querySelectorAll('#cd-boxes-tbody tr').forEach(tr => {
      const boxNo = (tr.querySelector('.cd-box-no').textContent || '').trim();
      const dims = (tr.querySelector('.cd-box-dims').value || '').trim();
      const wgt = (tr.querySelector('.cd-box-weight').value || '').trim();
      if (dims || wgt) {
        boxes.push({ boxNo, dimensions: dims, weight: wgt });
      }
    });
    payload.boxes = boxes;
    payload.dimensions = boxes.map(b => `${b.boxNo}: ${b.dimensions}`).filter(s => !s.endsWith(': ')).join(', ') || '';
    payload.weight = boxes.map(b => `${b.boxNo}: ${b.weight}`).filter(s => !s.endsWith(': ')).join(', ') || '';
    payload.includeDeclaration = document.getElementById('cd-include-declaration')?.checked ?? true;

    payload.items = items;
    payload.requesterEmail = sessionStorage.getItem('employeeOutlookEmail') || '';
    
    try {
      const res = await fetch('/api/employee/courier-dispatch', {
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
        btn.textContent = 'Submit Dispatch Request';
      }
    } catch (err) {
      showToast('Connection error. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Submit Dispatch Request';
    }
    return;
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

/* ── Courier & Dispatch Helpers ───────────────────────────────── */
window.onCDRemarksChange = function() {
  const select = document.getElementById('cd-remarks-type');
  const otherContainer = document.getElementById('cd-remarks-other-container');
  const otherInput = document.getElementById('cd-remarks-other');
  if (select && otherContainer && otherInput) {
    if (select.value === 'Others') {
      otherContainer.style.display = 'block';
      otherInput.required = true;
    } else {
      otherContainer.style.display = 'none';
      otherInput.required = false;
      otherInput.value = '';
    }
  }
};

window.onCDTransporterChange = function() {
  const select = document.getElementById('cd-transporter-select');
  const otherContainer = document.getElementById('cd-transporter-other-container');
  const otherInput = document.getElementById('cd-transporter-name');
  const amountContainer = document.getElementById('cd-transporter-amount-container');
  if (select && otherContainer && otherInput && amountContainer) {
    if (select.value === 'Other') {
      otherContainer.style.display = 'block';
      otherInput.required = true;
    } else {
      otherContainer.style.display = 'none';
      otherInput.required = false;
      otherInput.value = select.value;
    }

    if (select.value !== '') {
      amountContainer.style.display = 'block';
    } else {
      amountContainer.style.display = 'none';
      const amountInput = document.getElementById('cd-transporter-amount');
      if (amountInput) amountInput.value = '';
    }
  }
};

window.onCDFromAddressChange = function() {
  const select = document.getElementById('cd-from-address-id');
  const otherContainer = document.getElementById('cd-from-address-other-container');
  const otherInput = document.getElementById('cd-from-address-other');
  const preview = document.getElementById('cd-from-address-preview');
  const textInput = document.getElementById('cd-from-address-text');
  
  if (select && preview && textInput) {
    const val = select.value;
    let address = '';
    
    if (val.startsWith('saved_from_')) {
      const selectedOpt = select.options[select.selectedIndex];
      if (selectedOpt && selectedOpt.dataset.fullAddress) {
        address = selectedOpt.dataset.fullAddress;
      }
      if (otherContainer) otherContainer.style.display = 'none';
      if (otherInput) otherInput.required = false;
    } else if (val === '1') {
      address = 'Avana Medical Devices Pvt Ltd.,\nNo.91, Sundar Nagar 4th Avenue, Nandambakkam,\nChennai – 600032, Tamil Nadu, India.';
      if (otherContainer) otherContainer.style.display = 'none';
      if (otherInput) otherInput.required = false;
    } else if (val === '2') {
      address = 'Avana Surgical Systems Pvt Ltd.,\nNo.91, Sundar Nagar 4th Avenue, Nandambakkam,\nChennai – 600032, Tamil Nadu, India.';
      if (otherContainer) otherContainer.style.display = 'none';
      if (otherInput) otherInput.required = false;
    } else if (val === '3') {
      address = 'Avana Technology Services Pvt Ltd.,\nNo.91, Sundar Nagar 4th Avenue, Nandambakkam,\nChennai – 600032, Tamil Nadu, India.';
      if (otherContainer) otherContainer.style.display = 'none';
      if (otherInput) otherInput.required = false;
    } else if (val === 'Other') {
      if (otherContainer) otherContainer.style.display = 'block';
      if (otherInput) {
        otherInput.required = true;
        address = otherInput.value.trim();
      }
    } else {
      if (otherContainer) otherContainer.style.display = 'none';
      if (otherInput) otherInput.required = false;
    }

    if (address) {
      preview.textContent = address;
      preview.style.display = 'block';
      textInput.value = address;
    } else {
      preview.textContent = '';
      preview.style.display = 'none';
      textInput.value = '';
    }
  }
};

window.onCDToAddressChange = function() {
  const select = document.getElementById('cd-to-address-select');
  const toTextArea = document.getElementById('cd-to-address');
  
  if (select && toTextArea) {
    const val = select.value;
    if (val.startsWith('saved_to_')) {
      const selectedOpt = select.options[select.selectedIndex];
      if (selectedOpt && selectedOpt.dataset.fullAddress) {
        toTextArea.value = selectedOpt.dataset.fullAddress;
        toTextArea.readOnly = true;
      }
    } else if (val === '1') {
      toTextArea.value = 'Avana Medical Devices Pvt Ltd.,\nNo.52, 3rd Floor, Agastya Arcade, 80 feet Road, New BEL Rd, Devasandra Layout, Bengaluru – 560094, Karnataka, India.';
      toTextArea.readOnly = true;
    } else if (val === '2') {
      toTextArea.value = 'Avana Medical Devices Pvt Ltd.,\nThe Summit Business Bay (Omkar) Office No. 606, 6th Floor, Andheri Kurla Road, Chakala, Andheri East, Mumbai – 400093, India.';
      toTextArea.readOnly = true;
    } else if (val === '3') {
      toTextArea.value = 'Avana Medical Devices Pvt Ltd.,\nB6, Qutab Institutional Area\nNew Delhi, Delhi – 110016';
      toTextArea.readOnly = true;
    } else if (val === 'Other') {
      toTextArea.value = '';
      toTextArea.readOnly = false;
      toTextArea.focus();
    } else {
      toTextArea.value = '';
      toTextArea.readOnly = false;
    }
  }
};

async function loadCDSavedAddresses() {
  try {
    const token = sessionStorage.getItem('employeeToken');
    if (!token) return;
    const res = await fetch('/api/employee/saved-addresses', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    // 1. Saved From addresses
    const fromSelect = document.getElementById('cd-from-address-id');
    if (fromSelect && data.from && data.from.length > 0) {
      let optGroup = fromSelect.querySelector('optgroup[label="Your Saved Addresses"]');
      if (!optGroup) {
        optGroup = document.createElement('optgroup');
        optGroup.label = "Your Saved Addresses";
        const otherOpt = fromSelect.querySelector('option[value="Other"]');
        fromSelect.insertBefore(optGroup, otherOpt);
      }
      optGroup.innerHTML = '';
      data.from.forEach((addrText, idx) => {
        const opt = document.createElement('option');
        const firstLine = (addrText.split('\n')[0] || addrText).substring(0, 40);
        opt.value = `saved_from_${idx}`;
        opt.dataset.fullAddress = addrText;
        opt.textContent = `⭐ ${firstLine}...`;
        optGroup.appendChild(opt);
      });
    }

    // 2. Saved To addresses
    const toSelect = document.getElementById('cd-to-address-select');
    if (toSelect && data.to && data.to.length > 0) {
      let optGroup = toSelect.querySelector('optgroup[label="Your Saved Addresses"]');
      if (!optGroup) {
        optGroup = document.createElement('optgroup');
        optGroup.label = "Your Saved Addresses";
        const otherOpt = toSelect.querySelector('option[value="Other"]');
        toSelect.insertBefore(optGroup, otherOpt);
      }
      optGroup.innerHTML = '';
      data.to.forEach((addrText, idx) => {
        const opt = document.createElement('option');
        const firstLine = (addrText.split('\n')[0] || addrText).substring(0, 40);
        opt.value = `saved_to_${idx}`;
        opt.dataset.fullAddress = addrText;
        opt.textContent = `⭐ ${firstLine}...`;
        optGroup.appendChild(opt);
      });
    }
  } catch (e) {
    console.error('Error loading saved addresses:', e);
  }
}
window.loadCDSavedAddresses = loadCDSavedAddresses;

window.addCDItemRow = function() {
  const tbody = document.getElementById('cd-items-tbody');
  if (!tbody) return;
  const rowId = 'cd-row-' + Math.random().toString(36).substring(2, 8);
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.style.borderBottom = '1px solid #f1f5f9';
  tr.innerHTML = `
    <td style="padding: 0.4rem 0.2rem;">
      <input type="text" class="cd-item-code" placeholder="Item Code (optional)" style="width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none;">
    </td>
    <td style="padding: 0.4rem 0.2rem;">
      <input type="text" class="cd-item-desc" required placeholder="Item description" style="width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none;">
    </td>
    <td style="padding: 0.4rem 0.2rem;">
      <input type="text" class="cd-item-serial" placeholder="Serial No (optional)" style="width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none;">
    </td>
    <td style="padding: 0.4rem 0.2rem; text-align: center;">
      <input type="number" class="cd-item-qty" min="1" value="1" oninput="recalcCDRowValue('${rowId}')" style="width: 45px; text-align: center; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none; font-weight: 700;">
    </td>
    <td style="padding: 0.4rem 0.2rem; text-align: center;">
      <input type="number" class="cd-item-rate" min="0" value="0" step="0.01" oninput="recalcCDRowValue('${rowId}')" style="width: 65px; text-align: center; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none; font-weight: 700; color: #16a34a;">
    </td>
    <td style="padding: 0.4rem 0.2rem; text-align: right; font-weight: 700; color: #475569;" class="cd-item-val">
      ₹ 0.00
    </td>
    <td style="padding: 0.4rem 0.2rem; text-align: center;">
      <button type="button" onclick="removeCDItemRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 0.2rem;">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
  recalcCDTotal();
};

window.removeCDItemRow = function(rowId) {
  const tr = document.getElementById(rowId);
  if (tr) tr.remove();
  recalcCDTotal();
};

window.recalcCDRowValue = function(rowId) {
  const tr = document.getElementById(rowId);
  if (!tr) return;
  const qty = parseInt(tr.querySelector('.cd-item-qty').value, 10) || 0;
  const rate = parseFloat(tr.querySelector('.cd-item-rate').value) || 0;
  const value = qty * rate;
  tr.querySelector('.cd-item-val').textContent = '₹ ' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  recalcCDTotal();
};

window.recalcCDTotal = function() {
  let total = 0;
  document.querySelectorAll('#cd-items-tbody tr').forEach(tr => {
    const qty = parseInt(tr.querySelector('.cd-item-qty').value, 10) || 0;
    const rate = parseFloat(tr.querySelector('.cd-item-rate').value) || 0;
    total += qty * rate;
  });
  const display = document.getElementById('cd-total-display');
  const hidden = document.getElementById('cd-total-input');
  if (display) display.textContent = '₹ ' + total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (hidden) hidden.value = total;
};

// 📦 Date specific parcel merge workflow helper functions
window.onCDDateChange = async function() {
  const dateInput = document.getElementById('cd-dc-date');
  const container = document.getElementById('cd-merge-dispatches-container');
  const listDiv = document.getElementById('cd-merge-dispatches-list');
  if (!dateInput || !container || !listDiv) return;

  const date = dateInput.value;
  if (!date) {
    container.style.display = 'none';
    return;
  }

  try {
    const token = sessionStorage.getItem('employeeToken');
    const res = await fetch(`/api/employee/courier-dispatch/by-date?date=${date}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const dispatches = await res.json();
      if (dispatches && dispatches.length > 0) {
        container.style.display = 'block';
        listDiv.innerHTML = dispatches.map(d => `
          <div style="background:white; border:1px solid #fed7aa; border-radius:8px; padding:0.8rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:0.5rem; text-align:left;">
            <div>
              <div style="font-weight:700; color:#9a3412; font-size:0.88rem;">DC No: #${d.dcNo}</div>
              <div style="font-size:0.8rem; color:#4b5563; margin-top:0.15rem;">
                <strong>Transporter:</strong> ${d.transporterName || '—'} | 
                <strong>Billing:</strong> ${d.courierBilling || '—'}
              </div>
              <div style="font-size:0.75rem; color:#6b7280; margin-top:0.1rem;">
                <strong>Sender:</strong> ${d.senderName || '—'} (${d.requesterEmail || ''})
              </div>
            </div>
            <button type="button" onclick="openMergeModal('${d.id}', '${d.dcNo}')" style="background:#ea580c; color:white; border:none; border-radius:6px; padding:0.45rem 0.9rem; font-size:0.8rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:0.3rem;">
              🔗 Merge Request
            </button>
          </div>
        `).join('');
      } else {
        container.style.display = 'none';
      }
    } else {
      container.style.display = 'none';
    }
  } catch (err) {
    console.error('Error loading dispatches for merge:', err);
    container.style.display = 'none';
  }
};

let currentMergeDispatchId = null;

window.openMergeModal = function(dispatchId, dcNo) {
  currentMergeDispatchId = dispatchId;
  const dcSpan = document.getElementById('merge-target-dc');
  if (dcSpan) dcSpan.textContent = dcNo;

  const tbody = document.getElementById('merge-items-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    addMergeItemRow();
  }

  const modal = document.getElementById('cd-merge-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeMergeModal = function() {
  const modal = document.getElementById('cd-merge-modal');
  if (modal) modal.style.display = 'none';
  currentMergeDispatchId = null;
};

window.addMergeItemRow = function() {
  const tbody = document.getElementById('merge-items-tbody');
  if (!tbody) return;

  const rowId = 'mr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.style.borderBottom = '1px solid #f1f5f9';
  tr.innerHTML = `
    <td style="padding: 0.4rem 0.2rem;">
      <input type="text" class="mr-item-desc" required placeholder="Item description" style="width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none;">
    </td>
    <td style="padding: 0.4rem 0.2rem;">
      <input type="text" class="mr-item-serial" placeholder="Serial No" style="width: 100%; box-sizing: border-box; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none;">
    </td>
    <td style="padding: 0.4rem 0.2rem; text-align: center;">
      <input type="number" class="mr-item-qty" min="1" value="1" style="width: 60px; text-align: center; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none; font-weight: 700;">
    </td>
    <td style="padding: 0.4rem 0.2rem; text-align: right;">
      <input type="number" class="mr-item-rate" min="0" placeholder="0" style="width: 80px; text-align: right; padding: 0.4rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none;">
    </td>
    <td style="padding: 0.4rem 0.2rem; text-align: center;">
      <button type="button" onclick="removeMergeRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 0.2rem;">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
};

window.removeMergeRow = function(rowId) {
  const tr = document.getElementById(rowId);
  if (tr) tr.remove();
};

window.submitMergeRequest = async function() {
  const tbody = document.getElementById('merge-items-tbody');
  if (!tbody || !currentMergeDispatchId) return;

  const items = [];
  let isValid = true;
  tbody.querySelectorAll('tr').forEach(tr => {
    const desc = (tr.querySelector('.mr-item-desc').value || '').trim();
    const serialNo = (tr.querySelector('.mr-item-serial').value || '').trim();
    const qty = parseInt(tr.querySelector('.mr-item-qty').value, 10) || 0;
    const rate = parseFloat(tr.querySelector('.mr-item-rate').value) || 0;
    const value = qty * rate;
    if (desc) {
      items.push({ description: desc, serialNo, qty, rate, value });
    } else {
      isValid = false;
    }
  });

  if (!isValid || items.length === 0) {
    alert('Please enter descriptions for all items in the list.');
    return;
  }

  const token = sessionStorage.getItem('employeeToken');
  const requesterEmail = sessionStorage.getItem('employeeOutlookEmail') || '';
  
  try {
    const res = await fetch('/api/employee/courier-dispatch/merge-request', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        parentDispatchId: currentMergeDispatchId,
        requesterEmail: requesterEmail,
        items: items
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Merge Request submitted successfully! The owner of this Delivery Challan has been notified to Accept/Reject.');
      closeMergeModal();
    } else {
      alert(data.error || 'Failed to submit merge request.');
    }
  } catch (err) {
    console.error('Merge submission error:', err);
    alert('Server connection error. Please try again.');
  }
};

window.addCDBoxRow = function() {
  const tbody = document.getElementById('cd-boxes-tbody');
  if (!tbody) return;

  const count = tbody.querySelectorAll('tr').length + 1;
  const rowId = 'cd_box_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const tr = document.createElement('tr');
  tr.id = rowId;
  tr.style.borderBottom = '1px solid #f1f5f9';
  tr.innerHTML = `
    <td style="padding: 0.5rem 0.2rem; font-weight:700; color:var(--text-secondary);" class="cd-box-no">
      Box ${count}
    </td>
    <td style="padding: 0.4rem 0.2rem;">
      <input type="text" class="cd-box-dims" placeholder="e.g. 30x20x15 cm" style="width: 100%; box-sizing: border-box; padding: 0.45rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none;">
    </td>
    <td style="padding: 0.4rem 0.2rem;">
      <input type="text" class="cd-box-weight" placeholder="e.g. 4.5 kg" style="width: 100%; box-sizing: border-box; padding: 0.45rem; border: 1.5px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.85rem; outline: none;">
    </td>
    <td style="padding: 0.4rem 0.2rem; text-align: center;">
      <button type="button" onclick="removeCDBoxRow('${rowId}')" style="background: none; border: none; color: #ef4444; font-size: 1.1rem; cursor: pointer; padding: 0.2rem;">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
  realignCDBoxNumbers();
};

window.removeCDBoxRow = function(rowId) {
  const tr = document.getElementById(rowId);
  if (tr) tr.remove();
  realignCDBoxNumbers();
};

function realignCDBoxNumbers() {
  const tbody = document.getElementById('cd-boxes-tbody');
  if (!tbody) return;
  tbody.querySelectorAll('tr').forEach((tr, index) => {
    const noSpan = tr.querySelector('.cd-box-no');
    if (noSpan) noSpan.textContent = `Box ${index + 1}`;
  });
}
