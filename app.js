/* DON JERSEYS — storefront logic with Supabase product backend */

(() => {
  // ─── Configuration ───────────────────────────────────────────────
  const SUPABASE_URL = "https://favarmsrajwhgrakkpei.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_aiVYOvw7ZFVvEHktfyCQjw_5FFFf_37";
  const WHATSAPP_NUMBER = "233245432919";
  const CART_KEY = "don_cart_v1";

  const money = (n) => `₵${Number(n || 0).toFixed(0)}`;

  const CATEGORY_MAP = {
    club: "CLUB",
    national: "NATIONAL",
    retro: "RETRO",
    basketball: "BASKETBALL",
  };

  const KIT_BADGE_MAP = {
    home: "HOME",
    away: "AWAY",
    third: "THIRD",
    retro: "RETRO",
  };

  function mapProduct(row) {
    return {
      id: row.id,
      name: row.name,
      teamName: row.team_name,
      price: Number(row.price),
      category: CATEGORY_MAP[row.category] || row.category?.toUpperCase(),
      badge: KIT_BADGE_MAP[row.kit_type] || row.kit_type?.toUpperCase(),
      image: row.image_url || "",
      description: row.description || "",
      isAvailable: row.is_available,
    };
  }

  const els = {
    nav: document.querySelector(".nav"),
    grid: document.getElementById("productGrid"),
    pills: Array.from(document.querySelectorAll(".pill")),
    indicator: document.querySelector(".category-indicator"),

    cartBtn: document.getElementById("cartBtn"),
    cartBadge: document.getElementById("cartQtyBadge"),
    drawer: document.getElementById("cartDrawer"),
    drawerBackdrop: document.getElementById("drawerBackdrop"),
    closeDrawerBtn: document.getElementById("closeDrawerBtn"),
    cartList: document.getElementById("cartList"),
    cartSubtotal: document.getElementById("cartSubtotal"),
    checkoutBtn: document.getElementById("checkoutBtn"),

    modal: document.getElementById("checkoutModal"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    closeModalBtn: document.getElementById("closeModalBtn"),
    checkoutForm: document.getElementById("checkoutForm"),
    sizeToggles: document.getElementById("sizeToggles"),
    sizeHint: document.getElementById("sizeHint"),
    deliveryToggles: document.getElementById("deliveryToggles"),
    locationWrap: document.getElementById("locationWrap"),
    paymentToggles: document.getElementById("paymentToggles"),
    momoInstructions: document.getElementById("momoInstructions"),

    floatingWhatsApp: document.getElementById("floatingWhatsApp"),
    heroWhatsAppBtn: document.getElementById("heroWhatsAppBtn"),
    contactWhatsAppBtn: document.getElementById("contactWhatsAppBtn"),

    previewImg1: document.getElementById("previewImg1"),
    previewImg2: document.getElementById("previewImg2"),
    previewImg3: document.getElementById("previewImg3"),
    previewImg4: document.getElementById("previewImg4"),
  };

  const state = {
    filter: "ALL",
    products: [],
    loading: true,
    loadError: null,
    cart: new Map(),
    cardQty: new Map(),
    selectedSize: "",
    realtimeChannel: null,
  };

  let supabase = null;

  function initSupabase() {
    if (!window.supabase?.createClient) {
      console.error("Supabase client library not loaded");
      return null;
    }
    if (SUPABASE_URL === "https://favarmsrajwhgrakkpei.supabase.co" || SUPABASE_ANON_KEY === "sb_publishable_aiVYOvw7ZFVvEHktfyCQjw_5FFFf_37") {
      console.warn("Supabase credentials not configured");
      return null;
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  function loadCart() {
    const raw = localStorage.getItem(CART_KEY);
    const arr = safeParse(raw, []);
    if (!Array.isArray(arr)) return;
    state.cart.clear();
    for (const item of arr) {
      if (!item || !item.id) continue;
      const qty = Math.max(1, Number(item.qty || 1));
      state.cart.set(item.id, { ...item, qty });
    }
  }

  function saveCart() {
    const arr = Array.from(state.cart.values());
    localStorage.setItem(CART_KEY, JSON.stringify(arr));
  }

  function cartCount() {
    let total = 0;
    for (const it of state.cart.values()) total += it.qty;
    return total;
  }

  function cartSubtotal() {
    let total = 0;
    for (const it of state.cart.values()) total += it.qty * Number(it.price || 0);
    return total;
  }

  function badgeClass(badge) {
    const key = String(badge || "").toUpperCase();
    if (key === "HOME") return "badge--home";
    if (key === "AWAY") return "badge--away";
    if (key === "THIRD") return "badge--third";
    return "badge--retro";
  }

  function getFilteredProducts() {
    if (state.filter === "ALL") return state.products;
    return state.products.filter((p) => p.category === state.filter);
  }

  function findProduct(id) {
    return state.products.find((p) => p.id === id);
  }

  function setPreviewImages() {
    const kitOrder = ["HOME", "AWAY", "THIRD", "RETRO"];
    const picks = kitOrder.map((kit) => state.products.find((p) => p.badge === kit)).filter(Boolean);
    const fallback = state.products.slice(0, 4);
    const imgs = [els.previewImg1, els.previewImg2, els.previewImg3, els.previewImg4];

    for (let i = 0; i < imgs.length; i++) {
      const p = picks[i] || fallback[i];
      if (p?.image) {
        imgs[i].src = p.image;
        imgs[i].alt = p.name;
      }
    }
  }

  function renderSkeleton() {
    els.grid.innerHTML = Array.from({ length: 8 })
      .map(
        () => `
        <article class="card card--skeleton" aria-hidden="true">
          <div class="skeleton skeleton--badge"></div>
          <div class="skeleton skeleton--img"></div>
          <div class="card__body">
            <div class="skeleton skeleton--text"></div>
            <div class="skeleton skeleton--text skeleton--short"></div>
            <div class="skeleton skeleton--qty"></div>
            <div class="skeleton skeleton--btn"></div>
          </div>
        </article>
      `
      )
      .join("");
  }

  function renderLoadingState() {
    els.grid.setAttribute("aria-busy", "true");
    els.grid.innerHTML = `
      <div class="shop-status shop-status--loading">
        <div class="shop-status__spinner" aria-hidden="true"></div>
        <p class="shop-status__text">Loading jerseys...</p>
      </div>
    `;
  }

  function renderErrorState(message) {
    els.grid.setAttribute("aria-busy", "false");
    els.grid.innerHTML = `
      <div class="shop-status shop-status--error">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <p class="shop-status__title">Unable to load jerseys</p>
        <p class="shop-status__text">${message}</p>
        <button class="btn btn--primary" type="button" id="retryLoadBtn">TRY AGAIN</button>
      </div>
    `;
    document.getElementById("retryLoadBtn")?.addEventListener("click", () => fetchProducts());
  }

  function renderEmptyState() {
    els.grid.setAttribute("aria-busy", "false");
    els.grid.innerHTML = `
      <div class="shop-status shop-status--empty">
        <i class="fa-solid fa-shirt" aria-hidden="true"></i>
        <p class="shop-status__title">NO JERSEYS AVAILABLE</p>
        <p class="shop-status__text">There are currently no jerseys in this category.</p>
      </div>
    `;
  }

  function renderProducts() {
    els.grid.setAttribute("aria-busy", "true");
    const list = getFilteredProducts();

    if (list.length === 0) {
      renderEmptyState();
      return;
    }

    els.grid.innerHTML = list
      .map((p) => {
        const q = state.cardQty.get(p.id) || 1;
        return `
          <article class="card reveal" data-reveal="fade-up" data-product="${p.id}">
            <span class="card__badge ${badgeClass(p.badge)}">${p.badge}</span>
            <img class="card__img" src="${p.image}" alt="${p.name}" loading="lazy" decoding="async" />
            <div class="card__body">
              <h3 class="card__name">${p.name}</h3>
              <div class="card__price">${money(p.price)}</div>
              <div class="qty" aria-label="Select quantity">
                <button class="qty__btn" type="button" data-action="card-dec" data-id="${p.id}" aria-label="Decrease quantity">–</button>
                <div class="qty__val" data-qty-val="${p.id}">${q}</div>
                <button class="qty__btn" type="button" data-action="card-inc" data-id="${p.id}" aria-label="Increase quantity">+</button>
              </div>
              <button class="btn btn--primary card__add" type="button" data-action="add" data-id="${p.id}">
                ADD TO CART
              </button>
            </div>
          </article>
        `;
      })
      .join("");

    observeReveals();
    els.grid.setAttribute("aria-busy", "false");
  }

  let revealObserver = null;
  function observeReveals() {
    if (revealObserver) revealObserver.disconnect();
    const nodes = Array.from(document.querySelectorAll(".reveal:not(.is-in)"));
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const node = e.target;
          const delay = Number(node.getAttribute("data-delay") || 0);
          window.setTimeout(() => node.classList.add("is-in"), delay);
          revealObserver.unobserve(node);
        }
      },
      { threshold: 0.15 }
    );
    for (const n of nodes) revealObserver.observe(n);
  }

  function setActivePill(filter) {
    state.filter = filter;
    for (const b of els.pills) {
      const isActive = b.dataset.filter === filter;
      b.classList.toggle("is-active", isActive);
      b.setAttribute("aria-selected", isActive ? "true" : "false");
    }
    moveIndicator();
  }

  function moveIndicator() {
    const active = document.querySelector(".pill.is-active");
    if (!active || !els.indicator) return;
    const parent = active.parentElement;
    const pRect = parent.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const left = aRect.left - pRect.left + parent.scrollLeft;
    els.indicator.style.width = `${aRect.width}px`;
    els.indicator.style.transform = `translateX(${left}px)`;
    els.indicator.style.opacity = "1";
  }

  function addToCart(productId, qty) {
    const p = findProduct(productId);
    if (!p) return;
    const q = Math.max(1, Number(qty || 1));
    const existing = state.cart.get(productId);
    if (existing) {
      existing.qty += q;
      state.cart.set(productId, existing);
    } else {
      state.cart.set(productId, {
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        qty: q,
      });
    }
    saveCart();
    renderCart();
    openDrawer();
  }

  function setCartQty(productId, qty) {
    const item = state.cart.get(productId);
    if (!item) return;
    item.qty = Math.max(1, Number(qty || 1));
    state.cart.set(productId, item);
    saveCart();
    renderCart();
  }

  function incCart(productId, delta) {
    const item = state.cart.get(productId);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    state.cart.set(productId, item);
    saveCart();
    renderCart();
  }

  function removeCart(productId) {
    state.cart.delete(productId);
    saveCart();
    renderCart();
  }

  function pruneCart() {
    let changed = false;
    for (const [id] of state.cart) {
      if (!findProduct(id)) {
        state.cart.delete(id);
        changed = true;
      }
    }
    if (changed) saveCart();
  }

  function renderCart() {
    const count = cartCount();
    els.cartBadge.textContent = String(count);
    els.cartSubtotal.textContent = money(cartSubtotal());

    if (state.cart.size === 0) {
      els.cartList.innerHTML = `
        <div class="cart-empty">
          Your cart is empty. Add a jersey to start your order.
        </div>
      `;
      return;
    }

    els.cartList.innerHTML = Array.from(state.cart.values())
      .map((it) => {
        return `
          <div class="cart-item" data-cart-item="${it.id}">
            <img class="cart-item__img" src="${it.image}" alt="${it.name}" loading="lazy" decoding="async" />
            <div>
              <p class="cart-item__name">${it.name}</p>
              <div class="cart-item__meta">
                <span class="cart-item__price">${money(it.price)}</span>
                <div class="cart-actions">
                  <button class="qty__btn" type="button" data-action="cart-dec" data-id="${it.id}" aria-label="Decrease quantity">–</button>
                  <span class="qty__val" aria-label="Cart quantity">${it.qty}</span>
                  <button class="qty__btn" type="button" data-action="cart-inc" data-id="${it.id}" aria-label="Increase quantity">+</button>
                  <button class="remove-btn" type="button" data-action="remove" data-id="${it.id}" aria-label="Remove item">
                    <i class="fa-solid fa-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function setAriaHidden(el, hidden) {
    el.setAttribute("aria-hidden", hidden ? "true" : "false");
  }

  function lockScroll(locked) {
    document.documentElement.style.overflow = locked ? "hidden" : "";
    document.body.style.overflow = locked ? "hidden" : "";
  }

  function openDrawer() {
    els.drawer.classList.add("is-open");
    els.drawerBackdrop.hidden = false;
    setAriaHidden(els.drawer, false);
    lockScroll(true);
  }

  function closeDrawer() {
    els.drawer.classList.remove("is-open");
    setAriaHidden(els.drawer, true);
    els.drawerBackdrop.hidden = true;
    lockScroll(false);
  }

  function openModal() {
    if (state.cart.size === 0) return;
    els.modalBackdrop.hidden = false;
    els.modal.classList.add("is-open");
    setAriaHidden(els.modal, false);
    lockScroll(true);
  }

  function closeModal() {
    els.modal.classList.remove("is-open");
    setAriaHidden(els.modal, true);
    els.modalBackdrop.hidden = true;
    lockScroll(false);
  }

  function setToggleGroupActive(groupEl, value) {
    const buttons = Array.from(groupEl.querySelectorAll(".toggle"));
    for (const b of buttons) b.classList.toggle("is-active", b.dataset.value === value);
  }

  function whatsappUrlForMessage(message) {
    const base = `https://wa.me/${WHATSAPP_NUMBER}`;
    return `${base}?text=${encodeURIComponent(message)}`;
  }

  function openWhatsApp(messageOrNull) {
    const msg =
      messageOrNull ||
      `DON JERSEYS\n\nHi! I want to chat about jerseys and availability.\n`;
    window.open(whatsappUrlForMessage(msg), "_blank", "noopener,noreferrer");
  }

  function validateCheckout(form) {
    const fd = new FormData(form);
    const fullName = String(fd.get("fullName") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const size = String(fd.get("size") || "").trim();
    const deliveryMethod = String(fd.get("deliveryMethod") || "Pickup").trim();
    const location = String(fd.get("location") || "").trim();
    const paymentMethod = String(fd.get("paymentMethod") || "Mobile Money").trim();

    let ok = true;
    els.sizeHint.classList.remove("is-error");

    if (!fullName) ok = false;
    if (!phone) ok = false;
    if (!size) {
      ok = false;
      els.sizeHint.classList.add("is-error");
      els.sizeHint.textContent = "Please select a size.";
    } else {
      els.sizeHint.textContent = "Select a size to continue.";
    }

    if (deliveryMethod === "Delivery" && !location) ok = false;
    if (!paymentMethod) ok = false;

    return {
      ok,
      values: {
        fullName,
        phone,
        size,
        deliveryMethod,
        location,
        paymentMethod,
        customName: String(fd.get("customName") || "").trim(),
        customNumber: String(fd.get("customNumber") || "").trim(),
      },
    };
  }

  function buildOrderMessage(values) {
    const lines = [];
    lines.push("NEW ORDER – DDN JERSEYS");
    lines.push("");
    lines.push("CUSTOMER DETAILS");
    lines.push("");
    lines.push(`Name: ${values.fullName}`);
    lines.push(`Phone: ${values.phone}`);
    lines.push("");
    lines.push("ORDER ITEMS");
    lines.push("");

    for (const it of state.cart.values()) {
      lines.push(`• ${it.name} × ${it.qty}`);
    }

    lines.push("");
    lines.push("SIZE");
    lines.push(values.size);

    const hasCustom = Boolean(values.customName || values.customNumber);
    if (hasCustom) {
      lines.push("");
      lines.push("CUSTOMIZATION");
      if (values.customName) lines.push(`Name: ${values.customName}`);
      if (values.customNumber) lines.push(`Number: ${values.customNumber}`);
    }

    lines.push("");
    lines.push("DELIVERY METHOD");
    lines.push(values.deliveryMethod);

    if (values.deliveryMethod === "Delivery") {
      lines.push("");
      lines.push("LOCATION");
      lines.push(values.location || "-");
    }

    lines.push("");
    lines.push("PAYMENT METHOD");
    lines.push(values.paymentMethod);

    lines.push("");
    lines.push("TOTAL AMOUNT");
    lines.push(money(cartSubtotal()));

    return lines.join("\n");
  }

  async function fetchProducts() {
    if (!supabase) {
      state.loading = false;
      state.loadError = "Store configuration incomplete. Please check back soon.";
      renderErrorState(state.loadError);
      return;
    }

    state.loading = true;
    state.loadError = null;
    renderLoadingState();

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      state.products = (data || []).map(mapProduct);
      state.loading = false;
      pruneCart();
      setPreviewImages();
      renderProducts();
      renderCart();
    } catch (err) {
      console.error("Failed to fetch products:", err);
      state.loading = false;
      state.loadError = "We could not connect to the store. Please try again.";
      renderErrorState(state.loadError);
    }
  }

  function handleRealtimePayload(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === "INSERT" && newRow?.is_available) {
      const mapped = mapProduct(newRow);
      const exists = state.products.some((p) => p.id === mapped.id);
      if (!exists) state.products.unshift(mapped);
    } else if (eventType === "UPDATE") {
      const mapped = mapProduct(newRow);
      const idx = state.products.findIndex((p) => p.id === mapped.id);
      if (newRow.is_available) {
        if (idx >= 0) {
          state.products[idx] = mapped;
        } else {
          state.products.unshift(mapped);
        }
      } else if (idx >= 0) {
        state.products.splice(idx, 1);
      }
    } else if (eventType === "DELETE") {
      const id = oldRow?.id;
      if (id) {
        state.products = state.products.filter((p) => p.id !== id);
        if (state.cart.has(id)) {
          state.cart.delete(id);
          saveCart();
        }
      }
    }

    setPreviewImages();
    renderProducts();
    renderCart();
  }

  function setupRealtime() {
    if (!supabase) return;

    if (state.realtimeChannel) {
      supabase.removeChannel(state.realtimeChannel);
    }

    state.realtimeChannel = supabase
      .channel("public-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => handleRealtimePayload(payload)
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Realtime connection issue, refetching products...");
          fetchProducts();
        }
      });
  }

  function bindEvents() {
    const onScroll = () => {
      const scrolled = window.scrollY > 10;
      els.nav.classList.toggle("is-scrolled", scrolled);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    for (const b of els.pills) {
      b.addEventListener("click", () => {
        setActivePill(b.dataset.filter);
        renderProducts();
        requestAnimationFrame(moveIndicator);
      });
    }
    const catBar = document.querySelector(".category-bar");
    if (catBar) catBar.addEventListener("scroll", () => requestAnimationFrame(moveIndicator), { passive: true });
    window.addEventListener("resize", () => requestAnimationFrame(moveIndicator), { passive: true });

    els.grid.addEventListener("click", (e) => {
      const t = e.target.closest("[data-action]");
      if (!t) return;
      const action = t.dataset.action;
      const id = t.dataset.id;
      if (!id) return;

      const cur = state.cardQty.get(id) || 1;
      if (action === "card-inc") {
        const next = Math.min(9, cur + 1);
        state.cardQty.set(id, next);
        const valEl = els.grid.querySelector(`[data-qty-val="${id}"]`);
        if (valEl) valEl.textContent = String(next);
      }
      if (action === "card-dec") {
        const next = Math.max(1, cur - 1);
        state.cardQty.set(id, next);
        const valEl = els.grid.querySelector(`[data-qty-val="${id}"]`);
        if (valEl) valEl.textContent = String(next);
      }
      if (action === "add") {
        addToCart(id, cur);
      }
    });

    els.cartBtn.addEventListener("click", openDrawer);
    els.closeDrawerBtn.addEventListener("click", closeDrawer);
    els.drawerBackdrop.addEventListener("click", () => {
      if (els.modal.classList.contains("is-open")) return;
      closeDrawer();
    });

    els.cartList.addEventListener("click", (e) => {
      const t = e.target.closest("[data-action]");
      if (!t) return;
      const action = t.dataset.action;
      const id = t.dataset.id;
      if (!id) return;

      if (action === "cart-inc") incCart(id, 1);
      if (action === "cart-dec") incCart(id, -1);
      if (action === "remove") removeCart(id);
    });

    els.checkoutBtn.addEventListener("click", () => {
      if (state.cart.size === 0) return;
      closeDrawer();
      openModal();
    });

    els.closeModalBtn.addEventListener("click", closeModal);
    els.modalBackdrop.addEventListener("click", closeModal);

    els.sizeToggles.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle");
      if (!btn) return;
      const v = btn.dataset.value;
      setToggleGroupActive(els.sizeToggles, v);
      state.selectedSize = v;
      const sizeInput = els.checkoutForm.querySelector('input[name="size"]');
      sizeInput.value = v;
      els.sizeHint.classList.remove("is-error");
    });

    els.deliveryToggles.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle");
      if (!btn) return;
      const v = btn.dataset.value;
      setToggleGroupActive(els.deliveryToggles, v);
      const hidden = els.checkoutForm.querySelector('input[name="deliveryMethod"]');
      hidden.value = v;
      const open = v === "Delivery";
      els.locationWrap.dataset.open = open ? "true" : "false";
      if (!open) {
        const loc = els.checkoutForm.querySelector('input[name="location"]');
        loc.value = "";
      }
    });

    els.paymentToggles.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle");
      if (!btn) return;
      const v = btn.dataset.value;
      setToggleGroupActive(els.paymentToggles, v);
      const hidden = els.checkoutForm.querySelector('input[name="paymentMethod"]');
      hidden.value = v;
      els.momoInstructions.style.display = v === "Mobile Money" ? "" : "none";
    });

    els.checkoutForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (state.cart.size === 0) return;

      const res = validateCheckout(els.checkoutForm);
      if (!res.ok) {
        els.checkoutForm.reportValidity?.();
        return;
      }

      const msg = buildOrderMessage(res.values);
      openWhatsApp(msg);
    });

    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (els.modal.classList.contains("is-open")) return closeModal();
      if (els.drawer.classList.contains("is-open")) return closeDrawer();
    });

    const waClick = (e) => {
      e.preventDefault();
      openWhatsApp(null);
    };
    els.floatingWhatsApp.addEventListener("click", waClick);
    els.heroWhatsAppBtn.addEventListener("click", waClick);
    els.contactWhatsAppBtn.addEventListener("click", waClick);
  }

  async function init() {
    supabase = initSupabase();
    loadCart();
    renderCart();
    setActivePill("ALL");
    bindEvents();

    await fetchProducts();
    setupRealtime();

    observeReveals();
    requestAnimationFrame(moveIndicator);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
