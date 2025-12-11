// ============ CONFIG ============
// Replace this with the Apps Script Web App URL after you deploy (do NOT include /exec or /dev? Use the provided URL)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycby4KNN--49uttnqyLgqaJToGcBZ-9MeemMjQuegvMNzWoHqdxcacFJAsTCZVgBJgwl95w/exec"; // e.g. https://script.google.com/macros/s/AKfycbx.../exec

// The Google Sheet product view URL (your existing): gviz JSON feed
const sheetURL = "https://docs.google.com/spreadsheets/d/1gDRKAFFNtFlox6OyG8fr6y5PMRahFQLy_TQzXatJtwo/gviz/tq?tqx=out:json";

let products = [];
let cart = loadCart();

// ---------- load products from sheet ----------
async function loadProducts() {
  try {
    const res = await fetch(sheetURL);
    const text = await res.text();
    const jsonData = JSON.parse(text.substring(47).slice(0, -2));
    const rows = jsonData.table.rows;

    products = rows.slice(1).map(r => ({
      id: r.c[0]?.v?.toString?.() ?? cryptoRandomId(),
      name: r.c[1]?.v || r.c[0]?.v || "Unnamed",
      category: r.c[2]?.v || "",
      price: parseFloat(r.c[3]?.v) || 0,
      desc: r.c[4]?.v || "",
      image: r.c[5]?.v || ""
    }));

    populateCategoryFilter();
    displayProducts(products);
    updateCartCount();
  } catch (err) {
    console.error("Error loading products:", err);
    document.getElementById("product-list").innerHTML = "<p>Failed to load products.</p>";
  }
}

// fallback id generator if sheet doesn't provide ids
function cryptoRandomId() {
  return Math.random().toString(36).slice(2,9);
}

// ---------- display products with Add to Cart ----------
function displayProducts(list) {
  const container = document.getElementById("product-list");
  container.innerHTML = list.map(p => `
    <div class="product" data-category="${escapeHtml(p.category)}" data-id="${escapeHtml(p.id)}">
      ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">` : ''}
      <h3>${escapeHtml(p.name)}</h3>
      <p class="desc">${escapeHtml(p.desc)}</p>
      ${p.price ? `<p class="price">$${p.price.toFixed(2)}</p>` : ""}
      <button class="add-cart-btn" data-id="${escapeHtml(p.id)}">Add to cart</button>
    </div>
  `).join("");

  // lightbox for images
  document.querySelectorAll(".product img").forEach(img => {
    img.addEventListener("click", () => openLightbox(img.src));
  });

  // wire add-to-cart buttons
  document.querySelectorAll(".add-cart-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const prod = products.find(p => p.id === id);
      if (prod) addToCart(prod);
    });
  });
}

// simple escape to avoid injection in this context
function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ---------- search & filter ----------
document.getElementById("search").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  const filtered = products.filter(p =>
    (p.name||"").toLowerCase().includes(term) ||
    (p.desc||"").toLowerCase().includes(term) ||
    (p.category||"").toLowerCase().includes(term)
  );
  displayProducts(filtered);
});

document.getElementById("category-filter").addEventListener("change", e => {
  const cat = e.target.value;
  const filtered = cat ? products.filter(p => p.category === cat) : products;
  displayProducts(filtered);
});

function populateCategoryFilter() {
  const categories = [...new Set(products.map(p => p.category).filter(c => c))];
  const select = document.getElementById("category-filter");
  // remove existing options except first
  select.querySelectorAll("option:not(:first-child)").forEach(o => o.remove());
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

// ---------- lightbox ----------
function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  lb.classList.remove("hidden");
  document.getElementById("lightbox-img").src = src;
}
document.getElementById("close").addEventListener("click", () => {
  document.getElementById("lightbox").classList.add("hidden");
});

// ---------- CART logic ----------
function loadCart() {
  try {
    const raw = localStorage.getItem("site_cart_v1");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function saveCart() {
  localStorage.setItem("site_cart_v1", JSON.stringify(cart));
  updateCartCount();
  renderCart();
}
function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty = Math.min(999, (existing.qty || 1) + 1);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      image: product.image || "",
      qty: 1
    });
  }
  saveCart();
}
function updateCartCount() {
  const count = cart.reduce((s,i) => s + (i.qty||0), 0);
  document.getElementById("cart-count").textContent = count;
}
function cartSubtotal() {
  return cart.reduce((s,i) => s + (Number(i.price)||0) * (i.qty||0), 0);
}

// render cart items into panel
function renderCart() {
  const el = document.getElementById("cart-items");
  if (cart.length === 0) {
    el.innerHTML = `<p>Your cart is empty.</p>`;
  } else {
    el.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${escapeHtml(item.id)}">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : `<div style="width:60px;height:60px;background:#eee;border-radius:6px"></div>`}
        <div class="meta">
          <h4>${escapeHtml(item.name)}</h4>
          <div class="price">$${Number(item.price).toFixed(2)}</div>
        </div>
        <div class="actions">
          <input class="qty-input" type="number" min="1" max="999" value="${item.qty}" data-id="${escapeHtml(item.id)}">
          <button class="remove-item" data-id="${escapeHtml(item.id)}">Remove</button>
        </div>
      </div>
    `).join("");
  }

  document.getElementById("cart-subtotal").textContent = `$${cartSubtotal().toFixed(2)}`;

  // wire quantity inputs and remove buttons
  document.querySelectorAll(".qty-input").forEach(input => {
    input.addEventListener("change", (e) => {
      const id = e.currentTarget.dataset.id;
      const v = parseInt(e.currentTarget.value) || 1;
      const it = cart.find(x => x.id === id);
      if (it) it.qty = Math.max(1, Math.min(999, v));
      saveCart();
    });
  });
  document.querySelectorAll(".remove-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      cart = cart.filter(i => i.id !== id);
      saveCart();
    });
  });
}

// ---------- cart panel open/close ----------
const cartBtn = document.getElementById("cart-btn");
const cartPanel = document.getElementById("cart-panel");
const closeCart = document.getElementById("close-cart");

cartBtn.addEventListener("click", () => openCart());
closeCart.addEventListener("click", () => closeCartPanel());

function openCart() {
  cartPanel.classList.remove("closed");
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden", "false");
  renderCart();
}
function closeCartPanel() {
  cartPanel.classList.remove("open");
  cartPanel.classList.add("closed");
  cartPanel.setAttribute("aria-hidden", "true");
}

// ---------- checkout (send to Google Apps Script) ----------
document.getElementById("checkout-btn").addEventListener("click", async () => {
  if (!WEB_APP_URL || WEB_APP_URL.includes("REPLACE_WITH_YOUR_WEB_APP_URL")) {
    alert("Checkout not configured. Set WEB_APP_URL in script.js to your Apps Script Web App URL.");
    return;
  }
  if (cart.length === 0) { alert("Cart is empty."); return; }

  const name = document.getElementById("customer-name").value.trim();
  const contact = document.getElementById("customer-phone").value.trim();
  if (!name) { alert("Please enter your name."); return; }

  const payload = {
    timestamp: new Date().toISOString(),
    customerName: name,
    customerContact: contact,
    items: cart.map(i => ({ id: i.id, name: i.name, price: Number(i.price), qty: i.qty })),
    subtotal: cartSubtotal()
  };

  try {
    // Send POST request to Apps Script
    const resp = await fetch(WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || "Server error");

    // success
    alert("Order sent! We'll contact you. (Response: " + (data.status || "ok") + ")");
    cart = [];
    saveCart();
    closeCartPanel();
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Failed to send order. See console for details.");
  }
});

// ---------- initialize ----------
function init() {
  loadProducts();
  renderCart();
  updateCartCount();
}
init();

