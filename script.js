const sheetURL = "https://docs.google.com/spreadsheets/d/1gDRKAFFNtFlox6OyG8fr6y5PMRahFQLy_TQzXatJtwo/gviz/tq?tqx=out:json";
let products = [];

// Load products from Google Sheet
async function loadProducts() {
  try {
    const res = await fetch(sheetURL);
    const text = await res.text();
    const jsonData = JSON.parse(text.substring(47).slice(0, -2));
    const rows = jsonData.table.rows;

    products = rows.slice(1).map(r => ({
      name: r.c[0]?.v || "",
      category: r.c[1]?.v || "",
      price: parseFloat(r.c[2]?.v) || 0,
      desc: r.c[3]?.v || "",
      image: r.c[4]?.v || ""
    }));

    populateCategoryFilter();
    displayProducts(products);
  } catch (err) {
    console.error("Error loading products:", err);
    document.getElementById("product-list").innerHTML = "<p>Failed to load products.</p>";
  }
}

// Display products on page
function displayProducts(list) {
  const container = document.getElementById("product-list");
  container.innerHTML = list.map(p => `
    <div class="product" data-category="${p.category}">
      ${p.image ? `<img src="${p.image}" alt="${p.name}">` : ''}
      <h3>${p.name}</h3>
      <p class="desc">${p.desc}</p>
      ${p.price ? `<p class="price">$${p.price.toFixed(2)}</p>` : ""}
    </div>
  `).join("");

  // Lightbox for images
  document.querySelectorAll(".product img").forEach(img => {
    img.addEventListener("click", () => openLightbox(img.src));
  });
}

// Search filter
document.getElementById("search").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(term) ||
    p.desc.toLowerCase().includes(term) ||
    p.category.toLowerCase().includes(term)
  );
  displayProducts(filtered);
});

// Category filter
document.getElementById("category-filter").addEventListener("change", e => {
  const cat = e.target.value;
  const filtered = cat ? products.filter(p => p.category === cat) : products;
  displayProducts(filtered);
});

// Populate category dropdown
function populateCategoryFilter() {
  const categories = [...new Set(products.map(p => p.category).filter(c => c))];
  const select = document.getElementById("category-filter");
  // Clear existing options except the first
  select.querySelectorAll("option:not(:first-child)").forEach(o => o.remove());
  categories.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

// Lightbox functions
function openLightbox(src) {
  const lb = document.getElementById("lightbox");
  lb.classList.remove("hidden");
  document.getElementById("lightbox-img").src = src;
}
document.getElementById("close").addEventListener("click", () => {
  document.getElementById("lightbox").classList.add("hidden");
});

// Initialize page
loadProducts();
