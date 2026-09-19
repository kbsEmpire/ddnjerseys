/* DDN JERSEYS — Admin Dashboard */

(() => {
  const SUPABASE_URL = "https://favarmsrajwhgrakkpei.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_aiVYOvw7ZFVvEHktfyCQjw_5FFFf_37";
  const STORAGE_BUCKET = "jersey-images";
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const KIT_BADGE_MAP = {
    home: { label: "HOME", cls: "badge--home" },
    away: { label: "AWAY", cls: "badge--away" },
    third: { label: "THIRD", cls: "badge--third" },
    retro: { label: "RETRO", cls: "badge--retro" },
  };

  const CATEGORY_LABELS = {
    club: "Club",
    national: "National",
    retro: "Retro",
    basketball: "Basketball",
  };

  const VIEW_META = {
    dashboard: { title: "Dashboard", subtitle: "Overview of your jersey inventory" },
    products: { title: "Products", subtitle: "Manage your jersey catalog" },
    add: { title: "Add Product", subtitle: "Create a new jersey listing" },
    settings: { title: "Settings", subtitle: "Account and store settings" },
  };

  const money = (n) => `₵${Number(n || 0).toFixed(0)}`;

  const els = {
    sessionOverlay: document.getElementById("sessionOverlay"),
    loginView: document.getElementById("loginView"),
    adminApp: document.getElementById("adminApp"),
    loginForm: document.getElementById("loginForm"),
    loginError: document.getElementById("loginError"),
    loginBtn: document.getElementById("loginBtn"),
    togglePasswordBtn: document.getElementById("togglePasswordBtn"),
    loginPassword: document.getElementById("loginPassword"),
    togglePasswordIcon: document.getElementById("togglePasswordIcon"),
    logoutBtn: document.getElementById("logoutBtn"),
    settingsLogoutBtn: document.getElementById("settingsLogoutBtn"),
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    menuToggleBtn: document.getElementById("menuToggleBtn"),
    pageTitle: document.getElementById("pageTitle"),
    pageSubtitle: document.getElementById("pageSubtitle"),
    adminEmail: document.getElementById("adminEmail"),
    settingsEmail: document.getElementById("settingsEmail"),
    navLinks: Array.from(document.querySelectorAll(".sidebar__link[data-view]")),
    views: Array.from(document.querySelectorAll(".view")),
    statTotal: document.getElementById("statTotal"),
    statAvailable: document.getElementById("statAvailable"),
    statClub: document.getElementById("statClub"),
    statNational: document.getElementById("statNational"),
    statRetro: document.getElementById("statRetro"),
    statBasketball: document.getElementById("statBasketball"),
    productSearch: document.getElementById("productSearch"),
    productFilterPills: document.getElementById("productFilterPills"),
    productsLoading: document.getElementById("productsLoading"),
    productsTable: document.getElementById("productsTable"),
    productsTableBody: document.getElementById("productsTableBody"),
    productsCards: document.getElementById("productsCards"),
    productsEmpty: document.getElementById("productsEmpty"),
    productForm: document.getElementById("productForm"),
    formTitle: document.getElementById("formTitle"),
    productId: document.getElementById("productId"),
    uploadZone: document.getElementById("uploadZone"),
    imageInput: document.getElementById("imageInput"),
    uploadContent: document.getElementById("uploadContent"),
    uploadPreview: document.getElementById("uploadPreview"),
    uploadPreviewImg: document.getElementById("uploadPreviewImg"),
    removeUploadBtn: document.getElementById("removeUploadBtn"),
    uploadProgress: document.getElementById("uploadProgress"),
    imageError: document.getElementById("imageError"),
    formError: document.getElementById("formError"),
    formSuccess: document.getElementById("formSuccess"),
    submitFormBtn: document.getElementById("submitFormBtn"),
    submitBtnText: document.getElementById("submitBtnText"),
    cancelFormBtn: document.getElementById("cancelFormBtn"),
    availabilityLabel: document.getElementById("availabilityLabel"),
    previewBadge: document.getElementById("previewBadge"),
    previewImg: document.getElementById("previewImg"),
    previewPlaceholder: document.getElementById("previewPlaceholder"),
    previewName: document.getElementById("previewName"),
    previewMeta: document.getElementById("previewMeta"),
    previewPrice: document.getElementById("previewPrice"),
    deleteModalBackdrop: document.getElementById("deleteModalBackdrop"),
    deleteModal: document.getElementById("deleteModal"),
    deleteModalText: document.getElementById("deleteModalText"),
    deleteCancelBtn: document.getElementById("deleteCancelBtn"),
    deleteConfirmBtn: document.getElementById("deleteConfirmBtn"),
    toast: document.getElementById("toast"),
  };

  const state = {
    user: null,
    isAdmin: false,
    products: [],
    currentView: "dashboard",
    formMode: "add",
    editingProduct: null,
    uploadFile: null,
    uploadedImageUrl: null,
    uploadedStoragePath: null,
    existingStoragePath: null,
    productFilter: "all",
    deleteTarget: null,
    productsLoading: false,
  };

  let supabase = null;
  let toastTimer = null;

  function initSupabase() {
    // if (!window.supabase?.createClient) {
    //   showLoginError("Supabase library failed to load.");
    //   return null;
    // }
    // if (!SUPABASE_URL || SUPABASE_URL.trim() === "" || SUPABASE_URL.includes('https://favarmsrajwhgrakkpei.supabase.co')) {
    //   showLoginError("Supabase credentials not configured. See SUPABASE_SETUP.md");
    //   return null;
    // }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function showToast(message, type = "success") {
    els.toast.textContent = message;
    els.toast.className = `toast toast--${type}`;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 3500);
  }

  function setBtnLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle("is-loading", loading);
    const loader = btn.querySelector(".btn-loader");
    const text = btn.querySelector(".btn-text");
    if (loader) loader.hidden = !loading;
    if (text) text.style.opacity = loading ? "0" : "1";
  }

  function hideSessionOverlay() {
    els.sessionOverlay.hidden = true;
  }

  function showLogin() {
    els.loginView.hidden = false;
    els.adminApp.hidden = true;
  }

  function showDashboard(user) {
    els.loginView.hidden = true;
    els.adminApp.hidden = false;
    els.adminEmail.textContent = user.email;
    els.settingsEmail.textContent = user.email;
    closeSidebar();
  }

  function showLoginError(msg) {
    els.loginError.textContent = msg;
    els.loginError.hidden = !msg;
  }

  async function checkIsAdmin(userId) {
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Admin check failed:", error);
      return false;
    }
    return Boolean(data);
  }

  async function handleSession() {
    hideSessionOverlay();

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const isAdmin = await checkIsAdmin(session.user.id);
      if (!isAdmin) {
        await supabase.auth.signOut();
        showLogin();
        showLoginError("You do not have admin access.");
        return;
      }
      state.user = session.user;
      state.isAdmin = true;
      showDashboard(session.user);
      await loadProducts();
      switchView("dashboard");
    } else {
      showLogin();
    }
  }

  function setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        state.user = null;
        state.isAdmin = false;
        state.products = [];
        showLogin();
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        state.user = session.user;
      }
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    showLoginError("");
    setBtnLoading(els.loginBtn, true);

    const fd = new FormData(els.loginForm);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const isAdmin = await checkIsAdmin(data.user.id);
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("You do not have admin access.");
      }

      state.user = data.user;
      state.isAdmin = true;
      showDashboard(data.user);
      await loadProducts();
      switchView("dashboard");
      showToast("Signed in successfully");
    } catch (err) {
      showLoginError(err.message || "Invalid email or password.");
    } finally {
      setBtnLoading(els.loginBtn, false);
    }
  }

  async function handleLogout() {
    setBtnLoading(els.logoutBtn, true);
    try {
      await supabase.auth.signOut();
      showToast("Signed out");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setBtnLoading(els.logoutBtn, false);
    }
  }

  function openSidebar() {
    els.sidebar.classList.add("is-open");
    els.sidebarBackdrop.hidden = false;
  }

  function closeSidebar() {
    els.sidebar.classList.remove("is-open");
    els.sidebarBackdrop.hidden = true;
  }

  function switchView(viewName, options = {}) {
    state.currentView = viewName;

    for (const link of els.navLinks) {
      link.classList.toggle("is-active", link.dataset.view === viewName);
    }

    for (const view of els.views) {
      const isActive = view.dataset.view === viewName;
      view.hidden = !isActive;
      view.classList.toggle("is-active", isActive);
    }

    const meta = VIEW_META[viewName] || VIEW_META.dashboard;
    els.pageTitle.textContent = meta.title;
    els.pageSubtitle.textContent = meta.subtitle;

    if (viewName === "add" && options.mode !== "edit") {
      resetForm();
    }

    if (viewName === "products") {
      renderProductsTable();
    }

    if (viewName === "dashboard") {
      updateStats();
    }

    closeSidebar();
  }

  async function loadProducts() {
    state.productsLoading = true;
    if (state.currentView === "products") {
      els.productsLoading.hidden = false;
      els.productsTable.hidden = true;
      els.productsEmpty.hidden = true;
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      state.products = data || [];
      updateStats();
      if (state.currentView === "products") renderProductsTable();
    } catch (err) {
      console.error("Failed to load products:", err);
      showToast("Failed to load products", "error");
    } finally {
      state.productsLoading = false;
      if (state.currentView === "products") {
        els.productsLoading.hidden = true;
      }
    }
  }

  function updateStats() {
    const all = state.products;
    els.statTotal.textContent = all.length;
    els.statAvailable.textContent = all.filter((p) => p.is_available).length;
    els.statClub.textContent = all.filter((p) => p.category === "club").length;
    els.statNational.textContent = all.filter((p) => p.category === "national").length;
    els.statRetro.textContent = all.filter((p) => p.category === "retro").length;
    els.statBasketball.textContent = all.filter((p) => p.category === "basketball").length;
  }

  function getFilteredProducts() {
    let list = [...state.products];
    const filter = state.productFilter;
    if (filter !== "all") {
      list = list.filter((p) => p.category === filter);
    }
    const q = String(els.productSearch?.value || "").trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.team_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function renderProductsTable() {
    const list = getFilteredProducts();
    els.productsLoading.hidden = true;

    if (list.length === 0) {
      els.productsTable.hidden = true;
      if (els.productsCards) els.productsCards.innerHTML = "";
      els.productsEmpty.hidden = false;
      els.productsTableBody.innerHTML = "";
      return;
    }

    els.productsTable.hidden = false;
    els.productsEmpty.hidden = true;

    if (els.productsCards) {
      els.productsCards.innerHTML = list
        .map((p) => {
          const statusCls = p.is_available ? "status-badge--available" : "status-badge--unavailable";
          const statusText = p.is_available ? "Available" : "Unavailable";
          return `
            <div class="product-card-row" data-id="${p.id}">
              <img class="table-img" src="${p.image_url || ""}" alt="${p.name}" loading="lazy" />
              <div class="product-card-row__info">
                <h4>${p.name}</h4>
                <p>${p.team_name || "—"}</p>
                <div class="product-card-row__meta">
                  <span class="status-badge ${statusCls}">${statusText}</span>
                  <span>${CATEGORY_LABELS[p.category] || p.category}</span>
                </div>
              </div>
              <div>
                <div class="product-card-row__price">${money(p.price)}</div>
                <div class="table-actions" style="margin-top:8px">
                  <button class="action-btn" type="button" data-action="edit" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button>
                  <button class="action-btn action-btn--danger" type="button" data-action="delete" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
              </div>
            </div>
          `;
        })
        .join("");
    }

    els.productsTableBody.innerHTML = list
      .map((p) => {
        const statusCls = p.is_available ? "status-badge--available" : "status-badge--unavailable";
        const statusText = p.is_available ? "Available" : "Unavailable";
        const toggleIcon = p.is_available ? "fa-eye-slash" : "fa-eye";
        const toggleTitle = p.is_available ? "Mark unavailable" : "Mark available";

        return `
          <tr data-id="${p.id}">
            <td><img class="table-img" src="${p.image_url || ""}" alt="${p.name}" loading="lazy" /></td>
            <td>${p.team_name || "—"}</td>
            <td>${p.name}</td>
            <td>${CATEGORY_LABELS[p.category] || p.category}</td>
            <td>${KIT_BADGE_MAP[p.kit_type]?.label || p.kit_type}</td>
            <td>${money(p.price)}</td>
            <td><span class="status-badge ${statusCls}">${statusText}</span></td>
            <td>${formatDate(p.created_at)}</td>
            <td>
              <div class="table-actions">
                <button class="action-btn" type="button" data-action="edit" data-id="${p.id}" title="Edit">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn action-btn--toggle ${p.is_available ? "" : "is-off"}" type="button" data-action="toggle" data-id="${p.id}" title="${toggleTitle}">
                  <i class="fa-solid ${toggleIcon}"></i>
                </button>
                <button class="action-btn action-btn--danger" type="button" data-action="delete" data-id="${p.id}" title="Delete">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function resetForm() {
    state.formMode = "add";
    state.editingProduct = null;
    state.uploadFile = null;
    state.uploadedImageUrl = null;
    state.uploadedStoragePath = null;
    state.existingStoragePath = null;

    els.productForm.reset();
    els.productId.value = "";
    els.formTitle.textContent = "Add Jersey";
    els.submitBtnText.textContent = "ADD JERSEY";
    els.formError.hidden = true;
    els.formSuccess.hidden = true;
    els.imageError.hidden = true;

    els.uploadContent.hidden = false;
    els.uploadPreview.hidden = true;
    els.uploadProgress.hidden = true;
    els.imageInput.value = "";

    const availInput = els.productForm.querySelector('[name="isAvailable"]');
    if (availInput) availInput.checked = true;
    els.availabilityLabel.textContent = "Available";

    updatePreview();
  }

  function openEditForm(product) {
    state.formMode = "edit";
    state.editingProduct = product;
    state.existingStoragePath = product.storage_path || null;
    state.uploadedImageUrl = product.image_url || null;
    state.uploadedStoragePath = product.storage_path || null;
    state.uploadFile = null;

    els.productId.value = product.id;
    els.formTitle.textContent = "Edit Jersey";
    els.submitBtnText.textContent = "SAVE CHANGES";
    els.formError.hidden = true;
    els.formSuccess.hidden = true;

    const form = els.productForm;
    form.teamName.value = product.team_name || "";
    form.name.value = product.name || "";
    form.category.value = product.category || "club";
    form.kitType.value = product.kit_type || "home";
    form.price.value = product.price || "";
    form.description.value = product.description || "";
    form.isAvailable.checked = product.is_available !== false;
    els.availabilityLabel.textContent = product.is_available !== false ? "Available" : "Unavailable";

    if (product.image_url) {
      els.uploadContent.hidden = true;
      els.uploadPreview.hidden = false;
      els.uploadPreviewImg.src = product.image_url;
    } else {
      els.uploadContent.hidden = false;
      els.uploadPreview.hidden = true;
    }

    updatePreview();
    switchView("add", { mode: "edit" });
  }

  function updatePreview() {
    const form = els.productForm;
    const name = form.name?.value || "Jersey Name";
    const team = form.teamName?.value || "Team Name";
    const price = form.price?.value || 0;
    const kitType = form.kitType?.value || "home";
    const badge = KIT_BADGE_MAP[kitType] || KIT_BADGE_MAP.home;

    els.previewName.textContent = name;
    els.previewMeta.textContent = team;
    els.previewPrice.textContent = money(price);
    els.previewBadge.textContent = badge.label;
    els.previewBadge.className = `preview-card__badge ${badge.cls}`;

    const imgSrc = state.uploadFile
      ? URL.createObjectURL(state.uploadFile)
      : state.uploadedImageUrl;

    if (imgSrc) {
      els.previewImg.src = imgSrc;
      els.previewImg.hidden = false;
      els.previewPlaceholder.hidden = true;
    } else {
      els.previewImg.hidden = true;
      els.previewPlaceholder.hidden = false;
    }
  }

  function validateFile(file) {
    if (!file) return "Please select an image.";
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Unsupported format. Use JPG, PNG, or WEBP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large. Maximum size is 5MB.";
    }
    return null;
  }

  function handleFileSelect(file) {
    const err = validateFile(file);
    if (err) {
      els.imageError.textContent = err;
      els.imageError.hidden = false;
      return;
    }

    els.imageError.hidden = true;
    state.uploadFile = file;

    els.uploadContent.hidden = true;
    els.uploadPreview.hidden = false;
    els.uploadPreviewImg.src = URL.createObjectURL(file);

    updatePreview();
  }

  function clearUpload() {
    state.uploadFile = null;
    if (state.formMode === "add") {
      state.uploadedImageUrl = null;
      state.uploadedStoragePath = null;
    } else if (state.editingProduct) {
      state.uploadedImageUrl = state.editingProduct.image_url;
      state.uploadedStoragePath = state.editingProduct.storage_path;
    }

    els.imageInput.value = "";
    els.uploadContent.hidden = false;
    els.uploadPreview.hidden = true;
    updatePreview();
  }

  function generateStoragePath(file) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const uid = crypto.randomUUID();
    return `products/${uid}.${safeExt}`;
  }

  async function uploadImage(file) {
    const path = generateStoragePath(file);
    els.uploadProgress.hidden = false;

    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    els.uploadProgress.hidden = true;

    if (error) throw error;

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { path, url: urlData.publicUrl };
  }

  async function deleteStorageFile(path) {
    if (!path) return;
    try {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    } catch (err) {
      console.warn("Failed to delete storage file:", path, err);
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    els.formError.hidden = true;
    els.formSuccess.hidden = true;

    const form = els.productForm;
    const teamName = form.teamName.value.trim();
    const name = form.name.value.trim();
    const category = form.category.value;
    const kitType = form.kitType.value;
    const price = Number(form.price.value);
    const description = form.description.value.trim();
    const isAvailable = form.isAvailable.checked;

    if (!teamName || !name) {
      els.formError.textContent = "Team name and product name are required.";
      els.formError.hidden = false;
      return;
    }

    if (isNaN(price) || price < 0) {
      els.formError.textContent = "Price must be a non-negative number.";
      els.formError.hidden = false;
      return;
    }

    if (state.formMode === "add" && !state.uploadFile && !state.uploadedImageUrl) {
      els.formError.textContent = "Jersey image is required.";
      els.formError.hidden = false;
      return;
    }

    setBtnLoading(els.submitFormBtn, true);

    try {
      let imageUrl = state.uploadedImageUrl;
      let storagePath = state.uploadedStoragePath;
      let oldPathToDelete = null;

      if (state.uploadFile) {
        const uploaded = await uploadImage(state.uploadFile);
        imageUrl = uploaded.url;
        storagePath = uploaded.path;

        if (state.formMode === "edit" && state.existingStoragePath && state.existingStoragePath !== storagePath) {
          oldPathToDelete = state.existingStoragePath;
        }
      }

      if (!imageUrl) {
        throw new Error("Image upload failed. Please try again.");
      }

      const payload = {
        team_name: teamName,
        name,
        category,
        kit_type: kitType,
        price,
        description: description || null,
        is_available: isAvailable,
        image_url: imageUrl,
        storage_path: storagePath,
      };

      if (state.formMode === "edit" && state.editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", state.editingProduct.id);

        if (error) throw error;

        if (oldPathToDelete) await deleteStorageFile(oldPathToDelete);

        els.formSuccess.textContent = "Product updated successfully.";
        els.formSuccess.hidden = false;
        showToast("Product updated");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;

        els.formSuccess.textContent = "Product added successfully.";
        els.formSuccess.hidden = false;
        showToast("Product added");

        setTimeout(() => {
          resetForm();
          switchView("products");
        }, 1200);
      }

      await loadProducts();
    } catch (err) {
      console.error("Form submit error:", err);
      els.formError.textContent = err.message || "Failed to save product. Please try again.";
      els.formError.hidden = false;
    } finally {
      setBtnLoading(els.submitFormBtn, false);
    }
  }

  async function toggleAvailability(id) {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;

    const newVal = !product.is_available;

    try {
      const { error } = await supabase
        .from("products")
        .update({ is_available: newVal })
        .eq("id", id);

      if (error) throw error;

      product.is_available = newVal;
      updateStats();
      renderProductsTable();
      showToast(newVal ? "Product marked available" : "Product marked unavailable");
    } catch (err) {
      console.error("Toggle error:", err);
      showToast("Failed to update availability", "error");
    }
  }

  function openDeleteModal(product) {
    state.deleteTarget = product;
    els.deleteModalText.textContent = `Are you sure you want to delete "${product.name}"? This action cannot be undone.`;
    els.deleteModalBackdrop.hidden = false;
    els.deleteModal.hidden = false;
  }

  function closeDeleteModal() {
    state.deleteTarget = null;
    els.deleteModalBackdrop.hidden = true;
    els.deleteModal.hidden = true;
  }

  async function confirmDelete() {
    const product = state.deleteTarget;
    if (!product) return;

    setBtnLoading(els.deleteConfirmBtn, true);

    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;

      if (product.storage_path) {
        await deleteStorageFile(product.storage_path);
      }

      state.products = state.products.filter((p) => p.id !== product.id);
      updateStats();
      renderProductsTable();
      closeDeleteModal();
      showToast("Product deleted");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete product", "error");
    } finally {
      setBtnLoading(els.deleteConfirmBtn, false);
    }
  }

  function bindEvents() {
    els.loginForm.addEventListener("submit", handleLogin);
    els.logoutBtn.addEventListener("click", handleLogout);
    els.settingsLogoutBtn.addEventListener("click", handleLogout);

    els.togglePasswordBtn.addEventListener("click", () => {
      const isPassword = els.loginPassword.type === "password";
      els.loginPassword.type = isPassword ? "text" : "password";
      els.togglePasswordIcon.className = isPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    });

    els.menuToggleBtn.addEventListener("click", openSidebar);
    els.sidebarBackdrop.addEventListener("click", closeSidebar);

    for (const link of els.navLinks) {
      link.addEventListener("click", () => {
        const view = link.dataset.view;
        if (view === "add") resetForm();
        switchView(view);
      });
    }

    els.productSearch?.addEventListener("input", () => renderProductsTable());

    els.productFilterPills?.addEventListener("click", (e) => {
      const pill = e.target.closest(".filter-pill");
      if (!pill) return;
      state.productFilter = pill.dataset.filter;
      for (const p of els.productFilterPills.querySelectorAll(".filter-pill")) {
        p.classList.toggle("is-active", p === pill);
      }
      renderProductsTable();
    });

    function handleProductAction(e) {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const product = state.products.find((p) => p.id === id);
      if (!product) return;

      if (btn.dataset.action === "edit") openEditForm(product);
      if (btn.dataset.action === "toggle") toggleAvailability(id);
      if (btn.dataset.action === "delete") openDeleteModal(product);
    }

    els.productsTableBody.addEventListener("click", handleProductAction);
    els.productsCards?.addEventListener("click", handleProductAction);

    els.uploadZone.addEventListener("click", () => els.imageInput.click());
    els.uploadZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        els.imageInput.click();
      }
    });

    els.uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      els.uploadZone.classList.add("is-dragover");
    });
    els.uploadZone.addEventListener("dragleave", () => {
      els.uploadZone.classList.remove("is-dragover");
    });
    els.uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      els.uploadZone.classList.remove("is-dragover");
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileSelect(file);
    });

    els.imageInput.addEventListener("change", () => {
      const file = els.imageInput.files?.[0];
      if (file) handleFileSelect(file);
    });

    els.removeUploadBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearUpload();
    });

    els.productForm.addEventListener("input", updatePreview);
    els.productForm.addEventListener("change", (e) => {
      if (e.target.name === "isAvailable") {
        els.availabilityLabel.textContent = e.target.checked ? "Available" : "Unavailable";
      }
      updatePreview();
    });

    els.productForm.addEventListener("submit", handleFormSubmit);

    els.cancelFormBtn.addEventListener("click", () => {
      resetForm();
      switchView("products");
    });

    els.deleteCancelBtn.addEventListener("click", closeDeleteModal);
    els.deleteModalBackdrop.addEventListener("click", closeDeleteModal);
    els.deleteConfirmBtn.addEventListener("click", confirmDelete);
  }

  async function init() {
    supabase = initSupabase();
    if (!supabase) {
      hideSessionOverlay();
      showLogin();
      return;
    }

    setupAuthListener();
    bindEvents();
    await handleSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
