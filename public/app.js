const state = {
    products: [],
    cart: {},
};

const els = {
    products: document.getElementById('products'),
    cartToggle: document.getElementById('cartToggle'),
    cartPanel: document.getElementById('cartPanel'),
    closeCart: document.getElementById('closeCart'),
    cartCount: document.getElementById('cartCount'),
    cartItems: document.getElementById('cartItems'),
    cartTotal: document.getElementById('cartTotal'),
    backdrop: document.getElementById('backdrop'),
    clearCart: document.getElementById('clearCart'),
    payBtn: document.getElementById('payBtn'),
};

function formatPrice(value) {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(value);
}

async function fetchJSON(url, options) {
    const res = await fetch(url, Object.assign({headers: {'Content-Type': 'application/json'}}, options));
    if (!res.ok) throw new Error('Request failed');
    return res.json();
}

async function loadProducts() {
    const data = await fetchJSON('/api/products');
    const shopName = data.name || 'Shop';
    document.title = `Dark Shop — ${shopName}`;
    state.products = data.products || [];
    renderProducts();
}

async function loadCart() {
    const data = await fetchJSON('/api/cart');
    state.cart = data.items || {};
    renderCart();
}

function renderProducts() {
    els.products.innerHTML = state.products.map(p => `
    <article class="card">
      <img alt="${p.name}" src="${p.image}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.src='/img/placeholder.svg'"/>
      <div class="card-body">
        <h3 class="card-title">${p.name}</h3>
        <p class="card-price">${formatPrice(p.price)}</p>
        <button style="width: max-content" class="btn btn-primary" data-add="${p.id}">Add to cart</button>
      </div>
    </article>
  `).join('');
}

function calcTotal() {
    let sum = 0;
    for (const [id, qty] of Object.entries(state.cart)) {
        const product = state.products.find(p => p.id === id);
        if (product) sum += product.price * qty;
    }
    return sum;
}

function renderCart() {
    const entries = Object.entries(state.cart);
    els.cartCount.textContent = entries.reduce((acc, [, q]) => acc + q, 0);
    if (entries.length === 0) {
        els.cartItems.innerHTML = `<div class="empty">Cart is empty</div>`;
    } else {
        els.cartItems.innerHTML = entries.map(([id, qty]) => {
            const p = state.products.find(x => x.id === id);
            if (!p) return '';
            return `
        <div class="cart-item">
          <img src="${p.image}" alt="${p.name}" />
          <div>
            <div style="font-weight:600">${p.name}</div>
            <div style="color:#9aa4b2">${formatPrice(p.price)}</div>
          </div>
          <div class="qty">
            <button data-dec="${id}">−</button>
            <span>${qty}</span>
            <button data-inc="${id}">+</button>
          </div>
        </div>
      `;
        }).join('');
    }
    els.cartTotal.textContent = formatPrice(calcTotal());
}

async function addToCart(productId) {
    await fetchJSON('/api/cart/add', {method: 'POST', body: JSON.stringify({productId})});
    await loadCart();
}

async function decFromCart(productId) {
    await fetchJSON('/api/cart/remove', {method: 'POST', body: JSON.stringify({productId})});
    await loadCart();
}

async function clearCart() {
    await fetchJSON('/api/cart/clear', {method: 'POST'});
    await loadCart();
}

function openCart() {
    els.cartPanel.classList.add('open');
    els.backdrop.classList.add('show');
}

function closeCart() {
    els.cartPanel.classList.remove('open');
    els.backdrop.classList.remove('show');
}

async function goToPaymentForm() {
    try {
        const amount = calcTotal()
        if (!amount) return;
        const response = await fetch('/api/pay-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });
        if (response.ok) {
            const data = await response.json();
            window.open(data.payUrl, "_blank")
        }
    } catch (error) {
        console.error(error)
    }
}

document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const addId = target.getAttribute('data-add');
    const incId = target.getAttribute('data-inc');
    const decId = target.getAttribute('data-dec');
    if (addId) addToCart(addId);
    if (incId) addToCart(incId);
    if (decId) decFromCart(decId);
});

els.cartToggle.addEventListener('click', openCart);
els.closeCart.addEventListener('click', closeCart);
els.backdrop.addEventListener('click', closeCart);
els.clearCart.addEventListener('click', clearCart);
els.payBtn.addEventListener('click', goToPaymentForm);

(async function init() {
    await Promise.all([loadProducts(), loadCart()]);
})();

