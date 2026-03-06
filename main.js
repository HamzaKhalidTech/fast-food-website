// =================== STORAGE KEYS ===================
const CART_KEY = "foodie_cart_v3";
const WISH_KEY = "foodie_wishlist_v1";
const ADMIN_PRODUCTS_KEY = "foodie_admin_products_v2";
const AUTH_USERS_KEY = "foodie_users_v1";
const AUTH_CURRENT_KEY = "foodie_current_user_v1";
const ORDERS_KEY = "foodie_orders_v1";

// =================== BASIC HELPERS ===================
function safeParse(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function safeSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid() {
  return "ORD-" + Math.random().toString(16).slice(2).toUpperCase();
}

// =================== AUTH ===================
function getUsers() { return safeParse(AUTH_USERS_KEY, []); }
function setUsers(u) { safeSet(AUTH_USERS_KEY, u); }
function getCurrentUser() { return safeParse(AUTH_CURRENT_KEY, null); }
function setCurrentUser(u) { safeSet(AUTH_CURRENT_KEY, u); }
function logout() { localStorage.removeItem(AUTH_CURRENT_KEY); }
function requireAdmin() {
  const u = getCurrentUser();
  return u && u.role === "admin";
}

// =================== CART ===================
function getCart() { return safeParse(CART_KEY, []); }
function setCart(cart) { safeSet(CART_KEY, cart); updateCartBadge(); }

function updateCartBadge() {
  // multiple pages pe badge aa sakta hai
  const badges = document.querySelectorAll(".cart-value");
  if (!badges.length) return;

  const count = getCart().reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  badges.forEach(b => b.textContent = String(count));
}

function addToCart(product) {
  const cart = getCart();
  const pid = String(product.id);
  const found = cart.find(i => String(i.id) === pid);

  if (found) found.qty = (Number(found.qty) || 0) + 1;
  else cart.push({ ...product, id: pid, qty: 1 });

  setCart(cart);
}

function cartTotal() {
  return getCart().reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0
  );
}
function clearCart() { setCart([]); }

// ✅ Home page quick-add buttons handler (IMPORTANT)
function initHomeQuickAdd() {
  const buttons = document.querySelectorAll(".add-to-cart-inline");
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      const product = {
        id: String(btn.dataset.id || ""),
        name: btn.dataset.name || "Item",
        price: Number(btn.dataset.price) || 0,
        image: btn.dataset.image || "images/placeholder.png",
        category: btn.dataset.category || "general"
      };

      if (!product.id) return;
      addToCart(product);

      const old = btn.innerHTML;
      btn.innerHTML = "Added ✅";
      setTimeout(() => (btn.innerHTML = old), 900);
    });
  });
}

// =================== WISHLIST ===================
function getWish() { return safeParse(WISH_KEY, []); }
function setWish(w) { safeSet(WISH_KEY, w); }
function isWished(id) { return getWish().includes(String(id)); }
function toggleWish(id) {
  const sid = String(id);
  const w = getWish().map(String);
  const idx = w.indexOf(sid);
  if (idx >= 0) w.splice(idx, 1);
  else w.push(sid);
  setWish(w);
}

// =================== ADMIN PRODUCTS ===================
function getAdminProducts() { return safeParse(ADMIN_PRODUCTS_KEY, []); }
function setAdminProducts(items) { safeSet(ADMIN_PRODUCTS_KEY, items); }

function upsertAdminProduct(p) {
  const items = getAdminProducts();
  const pid = String(p.id);
  const i = items.findIndex(x => String(x.id) === pid);

  const clean = {
    ...p,
    id: pid,
    price: Number(p.price) || 0,
    category: (p.category || "general").toLowerCase(),
    image: p.image || "images/placeholder.png"
  };

  if (i >= 0) items[i] = clean;
  else items.push(clean);

  setAdminProducts(items);
}

function removeAdminProduct(id) {
  const sid = String(id);
  setAdminProducts(getAdminProducts().filter(x => String(x.id) !== sid));
}

// =================== ORDERS ===================
function getOrders() { return safeParse(ORDERS_KEY, []); }
function setOrders(o) { safeSet(ORDERS_KEY, o); }
function addOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  setOrders(orders);
}

// =================== NAV ACTIVE ===================
function setActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navlist a, .mobile-menu a").forEach(a => {
    const href = a.getAttribute("href") || "";
    const target = href.split("#")[0];
    a.classList.toggle("active", target === path);
  });
}

// =================== MOBILE MENU ===================
function initMobileMenu() {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  if (!hamburgerBtn || !mobileMenu) return;

  hamburgerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    mobileMenu.classList.toggle("mobile-menu-active");
  });

  document.addEventListener("click", (e) => {
    const inside = e.target.closest(".navbar");
    if (!inside) mobileMenu.classList.remove("mobile-menu-active");
  });

  mobileMenu.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => mobileMenu.classList.remove("mobile-menu-active"));
  });
}

// =================== MENU DATA (json + admin merge) ===================
async function getMenuItems() {
  let base = [];
  try {
    const res = await fetch("data/menu.json");
    base = await res.json();
  } catch {
    base = [];
  }

  const admin = getAdminProducts();
  const map = new Map(base.map(i => [String(i.id), i]));
  admin.forEach(i => map.set(String(i.id), i));

  return Array.from(map.values()).map(i => ({
    ...i,
    id: String(i.id),
    price: Number(i.price) || 0,
    category: (i.category || "general").toLowerCase(),
    image: i.image || "images/placeholder.png"
  }));
}

// =================== MENU PAGE ===================
async function loadMenuPage() {
  const mount = document.getElementById("menuList");
  if (!mount) return;

  const searchEl = document.getElementById("menuSearch");
  const rangeEl = document.getElementById("priceRange");
  const priceValueEl = document.getElementById("priceValue");
  const clearBtn = document.getElementById("clearFilters");
  const categoryEl = document.getElementById("categorySelect");
  const sortEl = document.getElementById("sortSelect");

  const all = await getMenuItems();

  function sortList(list) {
    const mode = sortEl?.value || "none";
    const copy = [...list];
    if (mode === "price-asc") copy.sort((a, b) => a.price - b.price);
    if (mode === "price-desc") copy.sort((a, b) => b.price - a.price);
    if (mode === "name-asc") copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }

  function render(list) {
    mount.innerHTML = sortList(list).map(item => `
      <div class="card product text-center">
        <img src="${item.image}" alt="${item.name}" />
        <h3 class="mt-2">${item.name}</h3>

        <div style="color:rgba(33,33,33,.65);font-size:.95rem;margin-top:.2rem">
          Category: <strong>${item.category}</strong>
        </div>

        <h4 class="price">$${item.price}</h4>

        <div class="flex" style="justify-content:center;gap:.6rem;margin-top:.6rem;flex-wrap:wrap">
          <button class="btn add-to-cart" data-id="${item.id}" type="button">Add to Cart</button>

          <button
            class="icon-btn wish-btn ${isWished(item.id) ? "active" : ""}"
            data-id="${item.id}"
            aria-label="Wishlist"
            type="button"
          >❤️</button>
        </div>
      </div>
    `).join("");

    mount.querySelectorAll(".add-to-cart").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = String(btn.dataset.id);
        const product = all.find(x => String(x.id) === id);
        if (product) addToCart(product);
      });
    });

    mount.querySelectorAll(".wish-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = String(btn.dataset.id);
        toggleWish(id);
        btn.classList.toggle("active");
      });
    });
  }

  function applyFilters() {
    const q = (searchEl?.value || "").trim().toLowerCase();
    const maxPrice = Number(rangeEl?.value || 50);
    const cat = (categoryEl?.value || "all").toLowerCase();

    if (priceValueEl) priceValueEl.textContent = `$${maxPrice}`;

    const filtered = all.filter(item => {
      const byName = item.name.toLowerCase().includes(q);
      const byPrice = item.price <= maxPrice;
      const byCat = (cat === "all") ? true : (item.category === cat);
      return byName && byPrice && byCat;
    });

    render(filtered);
  }

  if (rangeEl && priceValueEl) priceValueEl.textContent = `$${rangeEl.value || 50}`;
  applyFilters();

  searchEl?.addEventListener("input", applyFilters);
  rangeEl?.addEventListener("input", applyFilters);
  categoryEl?.addEventListener("change", applyFilters);
  sortEl?.addEventListener("change", applyFilters);

  clearBtn?.addEventListener("click", () => {
    if (searchEl) searchEl.value = "";
    if (rangeEl) rangeEl.value = "50";
    if (categoryEl) categoryEl.value = "all";
    if (sortEl) sortEl.value = "none";
    applyFilters();
  });
}

// =================== CART PAGE ===================
function renderCartPage() {
  const list = document.getElementById("cartList");
  const totalEl = document.getElementById("cartTotal");
  if (!list || !totalEl) return;

  const cart = getCart();

  if (cart.length === 0) {
    list.innerHTML = `<div class="card text-center">Cart is empty.</div>`;
    totalEl.textContent = "$0";
    return;
  }

  list.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="flex gap-2">
        <img src="${item.image}" alt="${item.name}" />
        <div>
          <h4>${item.name}</h4>
          <div class="price">$${item.price}</div>
        </div>
      </div>

      <div class="qty">
        <button class="dec" type="button">-</button>
        <strong>${item.qty}</strong>
        <button class="inc" type="button">+</button>
      </div>

      <button class="remove" type="button">Remove</button>
    </div>
  `).join("");

  totalEl.textContent = `$${cartTotal()}`;

  list.querySelectorAll(".cart-item").forEach(row => {
    const id = String(row.dataset.id);

    row.querySelector(".inc").addEventListener("click", () => {
      const c = getCart();
      const it = c.find(x => String(x.id) === id);
      if (!it) return;
      it.qty = (Number(it.qty) || 0) + 1;
      setCart(c);
      renderCartPage();
    });

    row.querySelector(".dec").addEventListener("click", () => {
      const c = getCart();
      const it = c.find(x => String(x.id) === id);
      if (!it) return;
      it.qty = (Number(it.qty) || 0) - 1;

      if (it.qty <= 0) setCart(c.filter(x => String(x.id) !== id));
      else setCart(c);

      renderCartPage();
    });

    row.querySelector(".remove").addEventListener("click", () => {
      setCart(getCart().filter(x => String(x.id) !== id));
      renderCartPage();
    });
  });
}

// =================== CHECKOUT ===================
function initCheckout() {
  const totalEl = document.getElementById("checkoutTotal");
  const form = document.getElementById("checkoutForm");
  const msg = document.getElementById("checkoutMsg");
  if (!totalEl || !form || !msg) return;

  totalEl.textContent = `$${cartTotal()}`;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const address = form.address.value.trim();
    const cart = getCart();

    if (cart.length === 0) {
      msg.style.display = "block";
      msg.style.color = "crimson";
      msg.textContent = "Cart is empty.";
      return;
    }
    if (!name || !phone || !address) {
      msg.style.display = "block";
      msg.style.color = "crimson";
      msg.textContent = "Please fill all fields.";
      return;
    }
    if (phone.length < 10) {
      msg.style.display = "block";
      msg.style.color = "crimson";
      msg.textContent = "Please enter a valid phone number.";
      return;
    }

    const current = getCurrentUser();
    addOrder({
      id: uid(),
      userEmail: current?.email || "guest",
      name,
      phone,
      address,
      items: cart,
      total: cartTotal(),
      createdAt: new Date().toISOString()
    });

    clearCart();
    window.location.href = "success.html";
  });
}

// =================== ORDERS PAGE ===================
function renderOrdersPage() {
  const mount = document.getElementById("ordersList");
  if (!mount) return;

  const current = getCurrentUser();
  const email = current?.email || "guest";
  const orders = getOrders().filter(o => o.userEmail === email);

  if (orders.length === 0) {
    mount.innerHTML = `<div class="card text-center">No orders found.</div>`;
    return;
  }

  mount.innerHTML = orders.map(o => `
    <div class="card" style="max-width:900px;margin:0 auto;margin-top:1rem">
      <div class="flex between" style="gap:1rem;flex-wrap:wrap">
        <div>
          <h3>Order ${o.id}</h3>
          <div style="color:rgba(33,33,33,.7)">Date: ${new Date(o.createdAt).toLocaleString()}</div>
          <div style="color:rgba(33,33,33,.7)">Customer: <strong>${o.name}</strong> (${o.userEmail})</div>
        </div>
        <div><h3 class="price">$${o.total}</h3></div>
      </div>

      <div class="mt-2" style="color:rgba(33,33,33,.75);line-height:1.7">
        <strong>Address:</strong> ${o.address}
      </div>

      <div class="mt-2">
        <strong>Items:</strong>
        <ul style="margin-top:.6rem;color:rgba(33,33,33,.75)">
          ${o.items.map(i => `<li>• ${i.name} x ${i.qty} = $${i.price * i.qty}</li>`).join("")}
        </ul>
      </div>
    </div>
  `).join("");
}

// =================== ADMIN LOCK + CRUD ===================
function initAdmin() {
  const lockBox = document.getElementById("adminLock");
  const panel = document.getElementById("adminPanel");
  const form = document.getElementById("adminForm");
  const msg = document.getElementById("adminMsg");
  const mount = document.getElementById("adminProducts");

  if (lockBox && panel) {
    if (!requireAdmin()) {
      lockBox.style.display = "block";
      panel.style.display = "none";
      return;
    } else {
      lockBox.style.display = "none";
      panel.style.display = "block";
    }
  }

  if (!form || !msg || !mount) return;

  function renderList(items) {
    mount.innerHTML = items.map(p => `
      <div class="admin-row" data-id="${p.id}">
        <div class="flex gap-2">
          <img src="${p.image}" alt="${p.name}" />
          <div>
            <strong>${p.name}</strong>
            <div class="range-value">ID: ${p.id} • Category: ${p.category || "general"} • $${p.price}</div>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-soft edit" type="button">Edit</button>
          <button class="btn btn-soft del" type="button">Delete</button>
        </div>
      </div>
    `).join("");

    mount.querySelectorAll(".admin-row").forEach(row => {
      const id = String(row.dataset.id);

      row.querySelector(".del").addEventListener("click", () => {
        removeAdminProduct(id);
        renderList(getAdminProducts());
      });

      row.querySelector(".edit").addEventListener("click", () => {
        const p = getAdminProducts().find(x => String(x.id) === id);
        if (!p) return;
        form.id.value = p.id;
        form.name.value = p.name;
        form.price.value = p.price;
        form.image.value = p.image;
        form.category.value = p.category || "general";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  renderList(getAdminProducts());

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const id = form.id.value.trim();
    const name = form.name.value.trim();
    const price = Number(form.price.value);
    const image = form.image.value.trim();
    const category = (form.category.value.trim() || "general").toLowerCase();

    if (!id || !name || !price || !image) {
      msg.style.display = "block";
      msg.style.color = "crimson";
      msg.textContent = "Please fill all fields.";
      return;
    }

    upsertAdminProduct({ id, name, price, image, category });

    msg.style.display = "block";
    msg.style.color = "green";
    msg.textContent = "Saved ✅";

    form.reset();
    renderList(getAdminProducts());
  });
}

// =================== LOGIN PAGE ===================
function initLoginPage() {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");
  const signupMsg = document.getElementById("signupMsg");
  const loginMsg = document.getElementById("loginMsg");
  const currentLabel = document.getElementById("currentUserLabel");
  const logoutBtn = document.getElementById("logoutBtn");

  if (currentLabel) {
    const u = getCurrentUser();
    currentLabel.textContent = u ? `${u.email} (${u.role})` : "None";
  }

  signupForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = signupForm.name.value.trim();
    const email = signupForm.email.value.trim().toLowerCase();
    const password = signupForm.password.value.trim();
    const role = signupForm.role.value;

    if (!name || !email || !password) {
      signupMsg.style.display = "block";
      signupMsg.style.color = "crimson";
      signupMsg.textContent = "Please fill all fields.";
      return;
    }

    const users = getUsers();
    if (users.some(u => u.email === email)) {
      signupMsg.style.display = "block";
      signupMsg.style.color = "crimson";
      signupMsg.textContent = "Email already exists.";
      return;
    }

    users.push({ name, email, password, role });
    setUsers(users);

    signupMsg.style.display = "block";
    signupMsg.style.color = "green";
    signupMsg.textContent = "Signup successful ✅ Now login.";
    signupForm.reset();
  });

  loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim().toLowerCase();
    const password = loginForm.password.value.trim();

    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      loginMsg.style.display = "block";
      loginMsg.style.color = "crimson";
      loginMsg.textContent = "Invalid credentials.";
      return;
    }

    setCurrentUser({ email: user.email, role: user.role, name: user.name });

    loginMsg.style.display = "block";
    loginMsg.style.color = "green";
    loginMsg.textContent = "Login successful ✅";

    if (currentLabel) currentLabel.textContent = `${user.email} (${user.role})`;

    if (user.role === "admin") window.location.href = "admin.html";
  });

  logoutBtn?.addEventListener("click", () => {
    logout();
    if (currentLabel) currentLabel.textContent = "None";
    loginMsg.style.display = "block";
    loginMsg.style.color = "green";
    loginMsg.textContent = "Logged out ✅";
  });
}

// =================== SWIPER ===================
function initSwiperIfExists() {
  const el = document.querySelector(".mySwiper");
  if (!el) return;
  if (typeof Swiper === "undefined") return;

  new Swiper(".mySwiper", {
    loop: true,
    spaceBetween: 20,
    slidesPerView: 1,
    autoplay: { delay: 2500, disableOnInteraction: false },
    pagination: { el: ".swiper-pagination", clickable: true },
    breakpoints: { 900: { slidesPerView: 2 } }
  });
}

// =================== CONTACT ===================
function initContactForm() {
  const form = document.getElementById("contactForm");
  const msg = document.getElementById("formMsg");
  if (!form || !msg) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      msg.style.display = "block";
      msg.style.color = "crimson";
      msg.textContent = "Please fill all fields.";
      return;
    }

    msg.style.display = "block";
    msg.style.color = "green";
    msg.textContent = "Message sent successfully ✅";
    form.reset();
  });
}

// =================== INIT ===================
document.addEventListener("DOMContentLoaded", async () => {
  initMobileMenu();
  setActiveNav();
  updateCartBadge();

  initHomeQuickAdd(); // ✅ NEW (home quick add buttons)

  await loadMenuPage();
  renderCartPage();
  initCheckout();
  renderOrdersPage();
  initAdmin();
  initLoginPage();
  initContactForm();
  initSwiperIfExists();
});
