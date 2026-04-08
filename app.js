/* DON JERSEYS — single-file storefront logic (no frameworks) */

(() => {
  const WHATSAPP_NUMBER = "233245432919";
  const CART_KEY = "don_cart_v1";

  const money = (n) => `₵${Number(n || 0).toFixed(0)}`;

  const products = [
    {
      id: "rm-home",
      name: "Real Madrid Home Jersey",
      price: 250,
      category: "CLUB",
      badge: "HOME",
      image:
        "images/download-18.webp",
    },
    {
      id: "barca-home",
      name: "Barcelona Home Jersey",
      price: 250,
      category: "CLUB",
      badge: "HOME",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/FC_Barcelona_2015%E2%80%9316_home_kit.jpg/800px-FC_Barcelona_2015%E2%80%9316_home_kit.jpg",
    },
    {
      id: "manu-home",
      name: "Manchester United Jersey",
      price: 250,
      category: "CLUB",
      badge: "HOME",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Manchester_United_2010-11_home_kit.png/800px-Manchester_United_2010-11_home_kit.png",
    },
    {
      id: "brazil-national",
      name: "Brazil National Jersey",
      price: 250,
      category: "NATIONAL",
      badge: "HOME",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Brazil_national_football_team_jersey_2010.jpg/800px-Brazil_national_football_team_jersey_2010.jpg",
    },
    {
      id: "argentina-national",
      name: "Argentina National Jersey",
      price: 250,
      category: "NATIONAL",
      badge: "HOME",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Argentina_2010_home_jersey.jpg/800px-Argentina_2010_home_jersey.jpg",
    },
    {
      id: "ghana-black-stars",
      name: "Ghana Black Stars Jersey",
      price: 250,
      category: "NATIONAL",
      badge: "HOME",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Ghana_national_football_team_jersey_2010.jpg/800px-Ghana_national_football_team_jersey_2010.jpg",
    },
    {
      id: "bulls",
      name: "Chicago Bulls Jersey",
      price: 250,
      category: "BASKETBALL",
      badge: "AWAY",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Chicago_Bulls_jersey.jpg/800px-Chicago_Bulls_jersey.jpg",
    },
    {
      id: "lakers",
      name: "LA Lakers Jersey",
      price: 250,
      category: "BASKETBALL",
      badge: "THIRD",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Los_Angeles_Lakers_jersey.jpg/800px-Los_Angeles_Lakers_jersey.jpg",
    },
    {
      id: "retro-1",
      name: "Retro Classic Football Jersey",
      price: 250,
      category: "RETRO",
      badge: "RETRO",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Football_shirt_Italy_1982.jpg/800px-Football_shirt_Italy_1982.jpg",
    },
    {
      id: "club-away-1",
      name: "Elite Club Away Jersey",
      price: 250,
      category: "CLUB",
      badge: "AWAY",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Football_shirt_Red_away.jpg/800px-Football_shirt_Red_away.jpg",
    },
    {
      id: "national-away-1",
      name: "National Away Jersey",
      price: 250,
      category: "NATIONAL",
      badge: "AWAY",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Football_shirt_white.jpg/800px-Football_shirt_white.jpg",
    },
    {
      id: "basketball-retro",
      name: "Retro Basketball Jersey",
      price: 250,
      category: "BASKETBALL",
      badge: "RETRO",
      image:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Basketball_jersey.jpg/800px-Basketball_jersey.jpg",
    },
  ];

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
    cart: new Map(), // id -> {id, name, price, image, qty}
    cardQty: new Map(), // id -> number (pre-add selector)
    selectedSize: "",
  };

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

  function setPreviewImages() {
    const picks = [
      products.find((p) => p.id === "rm-home"),
      products.find((p) => p.id === "ghana-black-stars"),
      products.find((p) => p.id === "lakers"),
      products.find((p) => p.id === "retro-1"),
    ].filter(Boolean);

    const imgs = [els.previewImg1, els.previewImg2, els.previewImg3, els.previewImg4];
    for (let i = 0; i < imgs.length; i++) {
      const p = picks[i] || products[i];
      imgs[i].src = p?.image || "";
    }
  }

  function renderProducts() {
    els.grid.setAttribute("aria-busy", "true");
    const list =
      state.filter === "ALL" ? products : products.filter((p) => p.category === state.filter);

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
    const p = products.find((x) => x.id === productId);
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
    lines.push("NEW ORDER – DON JERSEYS");
    lines.push("=====================");
    lines.push("CUSTOMER DETAILS");
    lines.push("=====================");
    lines.push(`Name: ${values.fullName}`);
    lines.push(`Phone: ${values.phone}`);
    lines.push("");
    lines.push("ORDER ITEMS");
    lines.push("");

    for (const it of state.cart.values()) {
      lines.push(`• ${it.name} × ${it.qty}`);
    }

    lines.push("");
    lines.push("SIZE")
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

    lines.push("=================");
    lines.push("TOTAL AMOUNT");
    lines.push(money(cartSubtotal()));
    lines.push("=================");

    return lines.join("\n");
  }

  function bindEvents() {
    // Navbar scroll blur
    const onScroll = () => {
      const scrolled = window.scrollY > 10;
      els.nav.classList.toggle("is-scrolled", scrolled);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Filters
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

    // Product grid actions (delegation)
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

    // Drawer open/close
    els.cartBtn.addEventListener("click", openDrawer);
    els.closeDrawerBtn.addEventListener("click", closeDrawer);
    els.drawerBackdrop.addEventListener("click", () => {
      if (els.modal.classList.contains("is-open")) return;
      closeDrawer();
    });

    // Cart actions in drawer (delegation)
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

    // Checkout
    els.checkoutBtn.addEventListener("click", () => {
      if (state.cart.size === 0) return;
      closeDrawer();
      openModal();
    });

    els.closeModalBtn.addEventListener("click", closeModal);
    els.modalBackdrop.addEventListener("click", closeModal);

    // Size toggles
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

    // Delivery toggles
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

    // Payment toggles
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

    // Global escape key
    window.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (els.modal.classList.contains("is-open")) return closeModal();
      if (els.drawer.classList.contains("is-open")) return closeDrawer();
    });

    // WhatsApp entry points
    const waClick = (e) => {
      e.preventDefault();
      openWhatsApp(null);
    };
    els.floatingWhatsApp.addEventListener("click", waClick);
    els.heroWhatsAppBtn.addEventListener("click", waClick);
    els.contactWhatsAppBtn.addEventListener("click", waClick);

    // Prevent footer social placeholders from navigating
    //for (const a of document.querySelectorAll(".social-link")) {
     // a.addEventListener("click", (e) => e.preventDefault());
   // }
  }

  function init() {
    setPreviewImages();
    loadCart();
    renderCart();
    setActivePill("ALL");
    renderProducts();
    bindEvents();

    // Initial reveal for hero elements already in view
    observeReveals();
    requestAnimationFrame(moveIndicator);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

