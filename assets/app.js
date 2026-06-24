/* =========================================================
   Dash Masternode Map — application script
   ========================================================= */

(() => {
  "use strict";

  // ---------- Continent lookup ----------
  const CONTINENTS = {
    "US":"North America","CA":"North America","MX":"North America","GT":"North America",
    "BZ":"North America","SV":"North America","HN":"North America","NI":"North America",
    "CR":"North America","PA":"North America","CW":"North America","DO":"North America",
    "PR":"North America","HT":"North America","JM":"North America","BS":"North America",
    "TT":"North America","BB":"North America","CU":"North America",
    "BR":"South America","AR":"South America","CO":"South America","PE":"South America",
    "VE":"South America","CL":"South America","EC":"South America","BO":"South America",
    "PY":"South America","UY":"South America","GY":"South America","SR":"South America",
    "GB":"Europe","IE":"Europe","FR":"Europe","DE":"Europe","IT":"Europe","ES":"Europe",
    "PT":"Europe","BE":"Europe","NL":"Europe","LU":"Europe","SE":"Europe","NO":"Europe",
    "DK":"Europe","FI":"Europe","IS":"Europe","CH":"Europe","AT":"Europe","PL":"Europe",
    "CZ":"Europe","HU":"Europe","SK":"Europe","SI":"Europe","HR":"Europe","BA":"Europe",
    "RS":"Europe","ME":"Europe","MK":"Europe","AL":"Europe","BG":"Europe","RO":"Europe",
    "GR":"Europe","EE":"Europe","LV":"Europe","LT":"Europe","MD":"Europe","UA":"Europe",
    "BY":"Europe","RU":"Europe","CY":"Europe","MT":"Europe","TR":"Europe",
    "CN":"Asia","JP":"Asia","KR":"Asia","IN":"Asia","PK":"Asia","BD":"Asia","TH":"Asia",
    "VN":"Asia","PH":"Asia","MY":"Asia","SG":"Asia","ID":"Asia","KH":"Asia","LA":"Asia",
    "MM":"Asia","NP":"Asia","LK":"Asia","MN":"Asia","KZ":"Asia","UZ":"Asia","TM":"Asia",
    "TJ":"Asia","KG":"Asia","AF":"Asia","IR":"Asia","IQ":"Asia","SY":"Asia","JO":"Asia",
    "LB":"Asia","IL":"Asia","SA":"Asia","AE":"Asia","QA":"Asia","KW":"Asia","OM":"Asia",
    "YE":"Asia","AM":"Asia","GE":"Asia","AZ":"Asia","HK":"Asia","TW":"Asia","MO":"Asia",
    "BT":"Asia","BN":"Asia","BH":"Asia","MV":"Asia",
    "ZA":"Africa","EG":"Africa","NG":"Africa","ET":"Africa","KE":"Africa","TZ":"Africa",
    "UG":"Africa","GH":"Africa","CI":"Africa","SN":"Africa","ML":"Africa","BF":"Africa",
    "NE":"Africa","TD":"Africa","CM":"Africa","CF":"Africa","CG":"Africa","CD":"Africa",
    "AO":"Africa","ZM":"Africa","ZW":"Africa","MW":"Africa","MZ":"Africa","BW":"Africa",
    "NA":"Africa","LY":"Africa","SD":"Africa","SS":"Africa","MR":"Africa","SO":"Africa",
    "DJ":"Africa","ER":"Africa","BI":"Africa","RW":"Africa","GQ":"Africa","GA":"Africa",
    "BJ":"Africa","TG":"Africa","GM":"Africa","GN":"Africa","SL":"Africa","LR":"Africa",
    "ST":"Africa","SC":"Africa","KM":"Africa","MU":"Africa","MG":"Africa","CV":"Africa",
    "SZ":"Africa","LS":"Africa","RE":"Africa","YT":"Africa","MA":"Africa","DZ":"Africa",
    "TN":"Africa",
    "AU":"Oceania","NZ":"Oceania","FJ":"Oceania","PG":"Oceania","SB":"Oceania","VU":"Oceania",
    "NC":"Oceania","PF":"Oceania","WS":"Oceania","TO":"Oceania","KI":"Oceania","TV":"Oceania",
    "NR":"Oceania","CK":"Oceania","NU":"Oceania","TK":"Oceania","FM":"Oceania","MH":"Oceania",
    "PW":"Oceania",
    "AQ":"Antarctica"
  };

  // ---------- Utilities ----------

  function flagEmoji(cc) {
    if (!cc || cc.length !== 2) return "";
    const A = 0x1F1E6;
    const codes = [...cc.toUpperCase()].map(c => A + c.charCodeAt(0) - 65);
    return String.fromCodePoint(...codes);
  }

  function shortASN(asn) {
    if (!asn) return "Unknown";
    const m = asn.match(/^AS\d+\s+(.+)$/);
    return m ? m[1] : asn;
  }

  function fmtNumber(n) {
    return new Intl.NumberFormat().format(n);
  }

  function fmtRelative(secondsAgo) {
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    if (secondsAgo < 3600) return `${Math.round(secondsAgo / 60)}m ago`;
    if (secondsAgo < 86400) return `${Math.round(secondsAgo / 3600)}h ago`;
    return `${Math.round(secondsAgo / 86400)}d ago`;
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function getTop(map, n = 6) {
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  // ---------- DOM ----------

  const $ = sel => document.querySelector(sel);
  const dom = {
    loading: $("#loading"),
    topbarStats: {
      total: $("#chip-total .chip__value"),
      active: $("#chip-active .chip__value"),
    },
    subtitle: $("#subtitle"),
    panel: $("#panel"),
    panelTitle: $("#panel-title"),
    panelBody: $("#panel-body"),
    tabs: document.querySelectorAll("[data-tab]"),
    fab: $("#fab"),
    closePanel: $("#panel-close"),
    handle: $("#panel-handle"),
    btnLocate: $("#btn-locate"),
    btnTheme: $("#btn-theme"),
  };

  // ---------- Map setup ----------

  const TILE_THEMES = {
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
    light: {
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  };

  const initialTheme = localStorage.getItem("dmnm:theme") || "dark";
  document.documentElement.dataset.theme = initialTheme;

  const map = L.map("map", {
    zoomControl: true,
    worldCopyJump: true,
    minZoom: 2,
    maxBoundsViscosity: 1,
  }).setView([25, 10], 2);

  let tileLayer = L.tileLayer(TILE_THEMES[initialTheme].url, {
    attribution: TILE_THEMES[initialTheme].attribution,
    maxZoom: 18,
    subdomains: "abcd",
  }).addTo(map);

  const markerCluster = L.markerClusterGroup({
    chunkedLoading: true,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
    maxClusterRadius: 50,
  }).addTo(map);

  function colorFor(mn) {
    if (mn.status === "POSE_BANNED") return "#e74c3c";
    if (mn.status === "ENABLED") return mn.type === "Evo" ? "#1ab1ff" : "#2ecc71";
    return "#9aa3b2";
  }

  function makeIcon(mn) {
    const c = colorFor(mn);
    const size = mn.type === "Evo" ? 14 : 12;
    return L.divIcon({
      html: `<div class="mn-marker" style="width:${size}px;height:${size}px;background:${c};"></div>`,
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function buildPopup(node) {
    const { key, ip, mn, geo } = node;
    const status = mn.status === "ENABLED" ? "Active" :
                   mn.status === "POSE_BANNED" ? "PoSe-banned" : mn.status;
    const statusCls = mn.status === "ENABLED" ? "active" :
                       mn.status === "POSE_BANNED" ? "banned" : "other";
    const typeCls = mn.type === "Evo" ? "evo" : "regular";
    const flag = flagEmoji(geo?.countryCode);
    const cityCountry = [geo?.city, geo?.country].filter(Boolean).join(", ");

    return `
      <div class="popup__title">
        <span class="popup__badge popup__badge--${statusCls}">${escapeHtml(status)}</span>
        <span class="popup__badge popup__badge--${typeCls}">${escapeHtml(mn.type || "?")}</span>
      </div>
      <div class="popup__row"><span>IP</span><strong>${escapeHtml(ip)}</strong></div>
      ${cityCountry ? `<div class="popup__row"><span>Location</span><strong>${flag} ${escapeHtml(cityCountry)}</strong></div>` : ""}
      ${geo?.as ? `<div class="popup__row"><span>ASN</span><strong>${escapeHtml(geo.as)}</strong></div>` : ""}
      ${geo?.isp ? `<div class="popup__row"><span>ISP</span><strong>${escapeHtml(geo.isp)}</strong></div>` : ""}
      <div class="popup__id" title="Pro Tx Hash / outpoint">${escapeHtml(key)}</div>
    `;
  }

  // ---------- State ----------

  const state = {
    nodes: [],                  // {key, ip, mn, geo, lat, lon}
    bounds: null,
    filters: {
      status: "all",            // all | active | banned
      type: "all",              // all | regular | evo
      country: "all",
      search: "",
    },
    activeTab: "overview",
    snapshotAt: null,
    markerByKey: new Map(),
  };

  // ---------- Data loading ----------

  async function loadData() {
    const [mnsRes, geoRes] = await Promise.all([
      fetch("masternodes.json"),
      fetch("masternodes_geolocations.json"),
    ]);
    if (!mnsRes.ok) throw new Error(`masternodes.json: ${mnsRes.status}`);
    if (!geoRes.ok) throw new Error(`geolocations.json: ${geoRes.status}`);
    const [masternodes, geolocations] = await Promise.all([mnsRes.json(), geoRes.json()]);

    const nodes = [];
    let maxPaidTime = 0;

    for (const key in masternodes) {
      const mn = masternodes[key];
      if (mn.lastpaidtime && mn.lastpaidtime > maxPaidTime) maxPaidTime = mn.lastpaidtime;

      if (!mn.address || mn.address === "[::]:0") {
        nodes.push({ key, ip: null, mn, geo: null, lat: null, lon: null });
        continue;
      }
      const ip = mn.address.split(":")[0];
      const geo = geolocations[ip];
      const has = geo && geo.status === "success" && typeof geo.lat === "number";
      nodes.push({
        key, ip, mn, geo: geo || null,
        lat: has ? geo.lat : null,
        lon: has ? geo.lon : null,
      });
    }
    state.nodes = nodes;
    if (maxPaidTime) state.snapshotAt = maxPaidTime;
  }

  // ---------- Stats ----------

  function computeStats(nodes) {
    let total = 0, active = 0, banned = 0, regular = 0, evo = 0, other = 0;
    const country = new Map();
    const asn = new Map();
    const continent = new Map();
    const isp = new Map();

    for (const n of nodes) {
      total++;
      const s = n.mn.status;
      const t = n.mn.type;
      if (s === "ENABLED") {
        active++;
        if (t === "Evo") evo++; else regular++;
      } else if (s === "POSE_BANNED") {
        banned++;
      } else {
        other++;
      }
      if (n.geo && n.geo.status === "success") {
        const c = n.geo.country || "Unknown";
        country.set(c, (country.get(c) || 0) + 1);
        const a = n.geo.as || "Unknown";
        asn.set(a, (asn.get(a) || 0) + 1);
        const cc = n.geo.countryCode || "";
        const cn = CONTINENTS[cc] || "Other";
        continent.set(cn, (continent.get(cn) || 0) + 1);
        const i = n.geo.isp || "Unknown";
        isp.set(i, (isp.get(i) || 0) + 1);
      }
    }
    return { total, active, banned, regular, evo, other, country, asn, continent, isp };
  }

  function countryList(nodes) {
    const m = new Map();
    for (const n of nodes) {
      const c = n.geo?.country;
      if (c) m.set(c, (m.get(c) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  // ---------- Filters ----------

  function nodeMatches(n, f) {
    if (f.status === "active" && n.mn.status !== "ENABLED") return false;
    if (f.status === "banned" && n.mn.status !== "POSE_BANNED") return false;
    if (f.type === "regular" && n.mn.type !== "Regular") return false;
    if (f.type === "evo" && n.mn.type !== "Evo") return false;
    if (f.country !== "all" && n.geo?.country !== f.country) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      const hay = [
        n.ip, n.key,
        n.geo?.country, n.geo?.city, n.geo?.as, n.geo?.isp, n.geo?.countryCode,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function applyFilters({ skipPanel = false } = {}) {
    const f = state.filters;
    const filtered = state.nodes.filter(n => nodeMatches(n, f));
    renderMarkers(filtered);
    renderTopbarStats(filtered);
    // Re-rendering the filters tab on every keystroke would destroy the active
    // <input>, drop the mobile keyboard, and reset the caret. Callers that
    // mutate filters from inside the filters tab pass skipPanel:true.
    if (!skipPanel) renderPanel(filtered);
    return filtered;
  }

  // ---------- Rendering ----------

  function renderMarkers(filtered) {
    markerCluster.clearLayers();
    state.markerByKey.clear();
    const layers = [];
    for (const n of filtered) {
      if (n.lat == null || n.lon == null) continue;
      const m = L.marker([n.lat, n.lon], { icon: makeIcon(n.mn) });
      m.bindPopup(() => buildPopup(n), { closeButton: true, maxWidth: 320 });
      layers.push(m);
      state.markerByKey.set(n.key, m);
    }
    if (layers.length) markerCluster.addLayers(layers);
  }

  function renderTopbarStats(filtered) {
    const s = computeStats(filtered);
    if (dom.topbarStats.total) dom.topbarStats.total.textContent = fmtNumber(s.total);
    if (dom.topbarStats.active) dom.topbarStats.active.textContent = fmtNumber(s.active);
  }

  function renderSubtitle() {
    if (!state.snapshotAt) {
      dom.subtitle.textContent = "Global network snapshot";
      return;
    }
    const secs = Math.max(0, Math.floor(Date.now() / 1000 - state.snapshotAt));
    dom.subtitle.textContent = `Snapshot ~${fmtRelative(secs)} · updates daily`;
  }

  function renderBarList(map, opts = {}) {
    const { topN = 6, decorate = null } = opts;
    const entries = getTop(map, topN);
    if (!entries.length) return `<div class="empty">No data</div>`;
    const max = entries[0][1] || 1;
    return `<ul class="bar-list">${entries.map(([label, count]) => {
      const pct = Math.round((count / max) * 100);
      const dec = decorate ? decorate(label) : "";
      return `<li class="bar">
        <span class="bar__fill" style="transform: scaleX(${(pct / 100).toFixed(3)})"></span>
        <span class="bar__label">${dec}${escapeHtml(label)}</span>
        <span class="bar__count">${fmtNumber(count)}</span>
      </li>`;
    }).join("")}</ul>`;
  }

  function renderOverviewTab(filtered) {
    const s = computeStats(filtered);
    const activePct = s.total ? Math.round((s.active / s.total) * 100) : 0;
    const bannedPct = s.total ? Math.round((s.banned / s.total) * 100) : 0;
    const evoPct = s.active ? Math.round((s.evo / s.active) * 100) : 0;

    const countryDecorate = label => {
      const cc = countryCodeFor(label);
      return cc ? `<span class="flag" aria-hidden="true">${flagEmoji(cc)}</span>` : "";
    };

    return `
      <div class="stat-grid">
        <div class="stat">
          <div class="stat__label">Total shown</div>
          <div class="stat__value">${fmtNumber(s.total)}</div>
          <div class="stat__sub">of ${fmtNumber(state.nodes.length)} total</div>
        </div>
        <div class="stat">
          <div class="stat__label">Active</div>
          <div class="stat__value">${fmtNumber(s.active)}</div>
          <div class="stat__sub">${activePct}% of shown</div>
        </div>
        <div class="stat">
          <div class="stat__label">PoSe-banned</div>
          <div class="stat__value">${fmtNumber(s.banned)}</div>
          <div class="stat__sub">${bannedPct}% of shown</div>
        </div>
        <div class="stat">
          <div class="stat__label">Evo nodes</div>
          <div class="stat__value">${fmtNumber(s.evo)}</div>
          <div class="stat__sub">${evoPct}% of active</div>
        </div>
      </div>

      <div class="section">
        <h3 class="section__title">Top countries <span class="section__hint">${s.country.size} total</span></h3>
        ${renderBarList(s.country, { decorate: countryDecorate })}
      </div>

      <div class="section">
        <h3 class="section__title">Top ASNs <span class="section__hint">${s.asn.size} total</span></h3>
        ${renderBarList(new Map([...s.asn].map(([k, v]) => [shortASN(k), v]))) /* clean labels */}
      </div>

      <div class="section">
        <h3 class="section__title">By continent</h3>
        ${renderBarList(s.continent, { topN: 8 })}
      </div>
    `;
  }

  let countryNameToCode = null;
  function countryCodeFor(name) {
    if (!countryNameToCode) {
      countryNameToCode = new Map();
      for (const n of state.nodes) {
        if (n.geo?.country && n.geo?.countryCode && !countryNameToCode.has(n.geo.country)) {
          countryNameToCode.set(n.geo.country, n.geo.countryCode);
        }
      }
    }
    return countryNameToCode.get(name) || null;
  }

  function renderFiltersTab() {
    const f = state.filters;
    const countries = countryList(state.nodes);

    return `
      <div class="field">
        <label class="field__label" for="filter-search">Search</label>
        <input id="filter-search" class="input input--search" type="search"
               placeholder="IP, country, city, ASN, ISP..." value="${escapeHtml(f.search)}"
               autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
      </div>

      <div class="field">
        <label class="field__label">Status</label>
        <div class="toggle-group" role="tablist" data-filter="status">
          <button class="toggle ${f.status === "all" ? "is-active" : ""}" data-value="all">All</button>
          <button class="toggle ${f.status === "active" ? "is-active" : ""}" data-value="active"><span class="dot" style="background:var(--success)"></span>Active</button>
          <button class="toggle ${f.status === "banned" ? "is-active" : ""}" data-value="banned"><span class="dot" style="background:var(--danger)"></span>PoSe-banned</button>
        </div>
      </div>

      <div class="field">
        <label class="field__label">Type</label>
        <div class="toggle-group" role="tablist" data-filter="type">
          <button class="toggle ${f.type === "all" ? "is-active" : ""}" data-value="all">All</button>
          <button class="toggle ${f.type === "regular" ? "is-active" : ""}" data-value="regular"><span class="dot" style="background:var(--regular)"></span>Regular</button>
          <button class="toggle ${f.type === "evo" ? "is-active" : ""}" data-value="evo"><span class="dot" style="background:var(--evo)"></span>Evo</button>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="filter-country">Country</label>
        <select id="filter-country" class="select">
          <option value="all">All countries (${countries.length})</option>
          ${countries.map(([name, count]) => {
            const cc = countryCodeFor(name);
            const flag = cc ? flagEmoji(cc) + " " : "";
            const sel = name === f.country ? "selected" : "";
            return `<option value="${escapeHtml(name)}" ${sel}>${flag}${escapeHtml(name)} (${count})</option>`;
          }).join("")}
        </select>
      </div>

      <div class="filter-row">
        <button class="btn btn--ghost" id="filter-reset">Reset all</button>
        <button class="btn" id="filter-fit">Fit results on map</button>
      </div>
    `;
  }

  function renderAboutTab() {
    return `
      <div class="section">
        <p style="margin:0 0 10px;color:var(--text-dim);line-height:1.55;">
          A live geographical view of the Dash masternode network. Markers cluster by region;
          tap a marker for details. Data refreshes daily via a GitHub Action and is hosted as
          a static site on Cloudflare Pages.
        </p>
      </div>

      <div class="section">
        <h3 class="section__title">Legend</h3>
        <ul class="bar-list">
          <li class="bar"><span class="bar__label"><span class="legend__swatch" style="background:var(--regular)"></span>Active · Regular</span></li>
          <li class="bar"><span class="bar__label"><span class="legend__swatch" style="background:var(--evo)"></span>Active · Evo</span></li>
          <li class="bar"><span class="bar__label"><span class="legend__swatch" style="background:var(--banned)"></span>PoSe-banned</span></li>
          <li class="bar"><span class="bar__label"><span class="legend__swatch" style="background:var(--inactive)"></span>Other / unknown</span></li>
        </ul>
      </div>

      <div class="section">
        <h3 class="section__title">Project</h3>
        <ul class="bar-list">
          <li class="bar"><span class="bar__label">Source</span><a class="bar__count" href="https://github.com/PastaPastaPasta/dash-mn-map" target="_blank" rel="noopener">GitHub ↗</a></li>
          <li class="bar"><span class="bar__label">Tiles</span><span class="bar__count">CARTO / OSM</span></li>
          <li class="bar"><span class="bar__label">Geo</span><span class="bar__count">ip-api.com</span></li>
        </ul>
      </div>
    `;
  }

  function renderPanel(filtered) {
    const titleMap = {
      overview: "Network overview",
      filters: "Filters & search",
      about: "About",
    };
    dom.panelTitle.textContent = titleMap[state.activeTab];

    if (state.activeTab === "overview") {
      dom.panelBody.innerHTML = renderOverviewTab(filtered);
    } else if (state.activeTab === "filters") {
      dom.panelBody.innerHTML = renderFiltersTab();
      wireFiltersTab();
    } else if (state.activeTab === "about") {
      dom.panelBody.innerHTML = renderAboutTab();
    }
    for (const t of dom.tabs) {
      t.classList.toggle("is-active", t.dataset.tab === state.activeTab);
    }
  }

  function wireFiltersTab() {
    const search = $("#filter-search");
    if (search) {
      search.addEventListener("input", debounce(e => {
        state.filters.search = e.target.value.trim();
        applyFilters({ skipPanel: true });
      }, 180));
    }
    for (const group of document.querySelectorAll(".toggle-group[data-filter]")) {
      const key = group.dataset.filter;
      group.addEventListener("click", e => {
        const btn = e.target.closest(".toggle");
        if (!btn) return;
        state.filters[key] = btn.dataset.value;
        for (const b of group.children) b.classList.toggle("is-active", b === btn);
        applyFilters({ skipPanel: true });
      });
    }
    const sel = $("#filter-country");
    if (sel) {
      sel.addEventListener("change", e => {
        state.filters.country = e.target.value;
        applyFilters({ skipPanel: true });
      });
    }
    const reset = $("#filter-reset");
    if (reset) {
      reset.addEventListener("click", () => {
        state.filters = { status: "all", type: "all", country: "all", search: "" };
        renderPanel(applyFilters({ skipPanel: true }));
      });
    }
    const fit = $("#filter-fit");
    if (fit) {
      fit.addEventListener("click", () => fitToMarkers());
    }
  }

  function fitToMarkers() {
    if (!state.markerByKey.size) return;
    const layers = [...state.markerByKey.values()];
    const group = L.featureGroup(layers);
    map.fitBounds(group.getBounds().pad(0.15), { animate: true, maxZoom: 7 });
  }

  // ---------- Panel UX (bottom sheet on mobile) ----------

  function openPanel() {
    dom.panel.classList.remove("is-collapsed");
    dom.panel.classList.add("is-open");
  }
  function collapsePanel() {
    dom.panel.classList.remove("is-open");
    dom.panel.classList.remove("is-collapsed");   // back to peek state
  }
  function hidePanel() {
    dom.panel.classList.remove("is-open");
    dom.panel.classList.add("is-collapsed");
  }

  function wirePanelChrome() {
    dom.closePanel.addEventListener("click", () => {
      if (window.matchMedia("(min-width: 900px)").matches) {
        hidePanel();
      } else {
        collapsePanel();
      }
    });
    dom.fab.addEventListener("click", () => {
      if (dom.panel.classList.contains("is-open")) {
        collapsePanel();
      } else {
        openPanel();
      }
    });
    for (const t of dom.tabs) {
      t.addEventListener("click", () => {
        state.activeTab = t.dataset.tab;
        renderPanel(applyFilters());
        openPanel();
      });
    }
    // Tap-vs-drag on the handle: a true tap toggles open/collapse, a drag
    // resizes the sheet. We suppress the synthesized click after a drag.
    const DRAG_THRESHOLD = 6;          // px moved before we call it a drag
    let startY = null, startTrans = 0, lastY = null;
    let dragging = false, moved = false;

    const onStart = e => {
      if (window.matchMedia("(min-width: 900px)").matches) return;
      startY = (e.touches ? e.touches[0].clientY : e.clientY);
      lastY = startY;
      startTrans = dom.panel.classList.contains("is-open") ? 0
                 : dom.panel.classList.contains("is-collapsed") ? dom.panel.offsetHeight
                 : Math.max(0, dom.panel.offsetHeight - 60);
      dragging = true;
      moved = false;
      dom.panel.style.transition = "none";
    };
    const onMove = e => {
      if (!dragging) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      lastY = y;
      const dy = y - startY;
      if (Math.abs(dy) > DRAG_THRESHOLD) moved = true;
      const next = Math.min(dom.panel.offsetHeight, Math.max(0, startTrans + dy));
      dom.panel.style.transform = `translateY(${next}px)`;
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      dom.panel.style.transition = "";
      if (!moved) {
        // True tap — clear any inline transform and let the click handler
        // below toggle state.
        dom.panel.style.transform = "";
        return;
      }
      const h = dom.panel.offsetHeight;
      const final = Math.min(h, Math.max(0, startTrans + (lastY - startY)));
      dom.panel.style.transform = "";
      if (final < h * 0.20) openPanel();
      else if (final > h * 0.65) hidePanel();
      else collapsePanel();
    };

    // Click toggles only on a non-drag tap. Use capture-phase suppression so
    // the synthesized post-drag click never reaches the toggle.
    dom.handle.addEventListener("click", e => {
      if (moved) { e.stopPropagation(); moved = false; return; }
      if (dom.panel.classList.contains("is-open")) collapsePanel();
      else openPanel();
    });

    dom.handle.addEventListener("touchstart", onStart, { passive: true });
    dom.handle.addEventListener("touchmove", onMove, { passive: true });
    dom.handle.addEventListener("touchend", onEnd);
    dom.handle.addEventListener("mousedown", onStart);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
  }

  // ---------- Theme toggle ----------

  function setTheme(name) {
    document.documentElement.dataset.theme = name;
    localStorage.setItem("dmnm:theme", name);
    map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(TILE_THEMES[name].url, {
      attribution: TILE_THEMES[name].attribution,
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(map);
  }

  function wireTheme() {
    dom.btnTheme.addEventListener("click", () => {
      const next = (document.documentElement.dataset.theme === "dark") ? "light" : "dark";
      setTheme(next);
    });
  }

  // ---------- Locate (focus visible markers) ----------

  function wireLocate() {
    dom.btnLocate.addEventListener("click", () => {
      fitToMarkers();
    });
  }

  // ---------- Boot ----------

  async function boot() {
    wirePanelChrome();
    wireTheme();
    wireLocate();
    try {
      await loadData();
      renderSubtitle();
      applyFilters();
      // Auto-fit on first load so the user sees the actual distribution
      setTimeout(fitToMarkers, 60);
    } catch (err) {
      console.error(err);
      dom.panelBody.innerHTML = `<div class="empty">Failed to load data: ${escapeHtml(err.message)}</div>`;
    } finally {
      dom.loading.classList.add("is-hidden");
    }
  }

  boot();
})();
