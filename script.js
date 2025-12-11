const sheetURL = "https://script.google.com/macros/s/AKfycby4KNN--49uttnqyLgqaJToGcBZ-9MeemMjQuegvMNzWoHqdxcacFJAsTCZVgBJgwl95w/exec
";

let products = [];
let cart = loadCart();

// Load products from Google Sheet
async function loadProducts() {
  try {
    const res = await fetch(sheetURL);
    const text = await res.text();
    const jsonData = JSON.parse(text.substring(47).slice(0, -2));
    const rows = jsonData.table.rows;

    products = rows.slice(1).map((r, i) => ({
      id: r.c[0]?.v?.toString() || "p" + i,
      name: r.c[0]?.v || "Unnamed",
      category: r.c[1]?.v || "",
      price: parseFloat(r.c[2]?.v) || 0,
      desc: r.c[3]?.v || "",
      image: r.c[4]?.v || ""
    }));

    populateCategoryFilter();
    displayProducts(products);
    updateCartCount();
  } catch (err) {
    console.error("Error loading products:", err);
    document.getElementById("product-list").innerHTML = "<p>Failed to load products.</p>";
  }
}

// Display products with quantity input and add-to-cart
function displayProducts(list) {
  const container = document.getElementById("product-list");
  container.innerHTML = list.map(p => `
    <div class="product" data-category="${p.category}">
      ${p.image ? `<img src="${p.image}" alt="${p.name}">` : ""}
      <h3>${p.name}</h3>
      <p class="desc">${p.desc}</p>
      <p class="price">$${p.price.toFixed(2)}</p>
      <div class="qty-box">
        <label>Qty:</label>
        <input type="number" min="1" value="1" id="qty-${p.id}">
      </div>
      <button onclick="addToCartFromInput('${p.id}')">Add to Cart</button>
    </div>
  `).join("");

  document.querySelectorAll(".product img").forEach(img => {
    img.addEventListener("click", () => openLightbox(img.src));
  });
}

// Add to cart from quantity input
function addToCartFromInput(id) {
  const product = products.find(p => p.id === id);
  const qtyInput = document.getElementById(`qty-${id}`);
  let qty = parseInt(qtyInput.value);
  if (!qty || qty < 1) qty = 1;

  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...product, qty });
  }
  saveCart();
}

// Load/save cart
function loadCart() {
  const raw = localStorage.getItem("site_cart_v1");
  return raw ? JSON.parse(raw) : [];
}
function saveCart() {
  localStorage.setItem("site_cart_v1", JSON.stringify(cart));
  updateCartCount();
  renderCart();
}

function updateCartCount() {
  const count = cart.reduce((s, i) => s + (i.qty || 0), 0);
  document.getElementById("cart-count").textContent = count;
}

function cartSubtotal() {
  return cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
}

// Render cart panel
function renderCart() {
  const el = document.getElementById("cart-items");
  if (cart.length === 0) {
    el.innerHTML = "<p>Your cart is empty.</p>";
    document.getElementById("cart-subtotal").textContent = "0.00";
    return;
  }

  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ""}
      <div class="meta">
        <h4>${item.name}</h4>
        <div class="price">$${item.price.toFixed(2)}</div>
      </div>
      <div class="actions">
        <input type="number" min="1" value="${item.qty}" data-id="${item.id}" class="qty-input">
        <button class="remove-item" data-id="${item.id}">Remove</button>
      </div>
    </div>
  `).join("");

  document.getElementById("cart-subtotal").textContent = cartSubtotal().toFixed(2);

  document.querySelectorAll(".qty-input").forEach(input => {
    input.addEventListener("change", e => {
      const id = e.currentTarget.dataset.id;
      const qty = Math.max(1, parseInt(e.currentTarget.value) || 1);
      const item = cart.find(i => i.id === id);
      if (item) item.qty = qty;
      saveCart();
    });
  });

  document.querySelectorAll(".remove-item").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.currentTarget.dataset.id;
      cart = cart.filter(i => i.id !== id);
      saveCart();
    });
  });
}

// Cart panel open/close
const cartBtn = document.getElementById("cart-btn");
const cartPanel = document.getElementById("cart-panel");
const closeCart = document.getElementById("close-cart");

cartBtn.addEventListener("click", () => cartPanel.classList.add("open"));
closeCart.addEventListener("click", () => cartPanel.classList.remove("open"));

// Category filter
document.getElementById("category-filter").addEventListener("change", e => {
  const cat = e.target.value;
  const filtered = cat ? products.filter(p => p.category === cat) : products;
  displayProducts(filtered);
});

// Search
document.getElementById("search").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(term) ||
    p.desc.toLowerCase().includes(term) ||
    p.category.toLowerCase().includes(term)
  );
  displayProducts(filtered);
});

// Populate category filter with All
function populateCategoryFilter() {
  const select = document.getElementById("category-filter");
  select.innerHTML = '<option value="">All</option>';
  const categories = [...new Set(products.map(p => p.category).filter(c => c))];
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

// Lightbox
function openLightbox(src) {
  document.getElementById("lightbox").classList.remove("hidden");
  document.getElementById("lightbox-img").src = src;
}
document.getElementById("close").addEventListener("click", () => {
  document.getElementById("lightbox").classList.add("hidden");
});

// Initialize
loadProducts();
renderCart();
updateCartCount();

