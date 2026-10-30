// AURA Haute Couture - Main Store Controller

class AuraStore {
  constructor() {
    this.products = [];
    this.cart = JSON.parse(localStorage.getItem('aura_cart') || '[]');
    this.theme = localStorage.getItem('aura_theme') || 'light';
    this.currency = 'دج';
    this.init();
  }

  async init() {
    this.applyTheme(this.theme);
    await this.loadProducts();
    this.updateCartBadge();
    this.renderCartDrawer();
    this.bindEvents();
  }

  async loadProducts() {
    try {
      const res = await fetch('./data/products.json');
      this.products = await res.json();
    } catch (e) {
      console.error('Failed to load products:', e);
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aura_theme', theme);
    this.theme = theme;
    
    // Update logo color if needed
    const logoImg = document.querySelector('.site-logo img');
    if (logoImg) {
      logoImg.src = theme === 'dark' ? './assets/icons/logo-light.svg' : './assets/icons/logo.svg';
    }
  }

  toggleTheme() {
    const nextTheme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(nextTheme);
  }

  formatPrice(num) {
    return num.toLocaleString('fr-DZ') + ' ' + this.currency;
  }

  addToCart(productId, size = 'M', color = null) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const existing = this.cart.find(item => item.id === productId && item.size === size);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        id: product.id,
        nameAr: product.nameAr,
        price: product.price,
        image: product.image,
        size: size,
        color: color || (product.colors && product.colors[0]?.name) || 'افتراضي',
        quantity: 1
      });
    }

    this.saveCart();
    this.showToast(`تمت إضافة "${product.nameAr}" إلى حقيبة التسوق`);
    this.openCart();
  }

  removeFromCart(productId, size) {
    this.cart = this.cart.filter(item => !(item.id === productId && item.size === size));
    this.saveCart();
    this.renderCartDrawer();
  }

  updateQuantity(productId, size, delta) {
    const item = this.cart.find(i => i.id === productId && i.size === size);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.removeFromCart(productId, size);
    } else {
      this.saveCart();
      this.renderCartDrawer();
    }
  }

  saveCart() {
    localStorage.setItem('aura_cart', JSON.stringify(this.cart));
    this.updateCartBadge();
    this.renderCartDrawer();
  }

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getCartCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  updateCartBadge() {
    const badges = document.querySelectorAll('.cart-count');
    const count = this.getCartCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'grid' : 'none';
    });
  }

  renderCartDrawer() {
    const listEl = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    if (!listEl || !totalEl) return;

    if (this.cart.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--color-muted-foreground);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p style="font-size: 1rem; font-weight: 600;">حقيبة التسوق فارغة حالياً</p>
          <p style="font-size: 0.85rem; margin-top: 0.5rem;">استكشف تشكيلاتنا الفاخرة واختر ما يناسبك</p>
        </div>
      `;
      totalEl.textContent = '0 ' + this.currency;
      return;
    }

    listEl.innerHTML = this.cart.map(item => `
      <div class="cart-item-row">
        <img src="${item.image}" alt="${item.nameAr}" class="cart-item-img">
        <div class="cart-item-info">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">${item.nameAr}</h4>
          <p style="font-size: 0.75rem; color: var(--color-muted-foreground); margin-bottom: 8px;">
            المقاس: <strong>${item.size}</strong> | اللون: <strong>${item.color}</strong>
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px; background: var(--color-muted); border-radius: 6px; padding: 2px 8px;">
              <button onclick="window.auraStore.updateQuantity('${item.id}', '${item.size}', -1)" style="border:none;background:none;cursor:pointer;font-size:1.1rem;font-weight:700;">-</button>
              <span style="font-size: 0.9rem; font-weight:700;">${item.quantity}</span>
              <button onclick="window.auraStore.updateQuantity('${item.id}', '${item.size}', 1)" style="border:none;background:none;cursor:pointer;font-size:1.1rem;font-weight:700;">+</button>
            </div>
            <span style="font-weight: 800; font-family: var(--font-mono);">${this.formatPrice(item.price * item.quantity)}</span>
          </div>
        </div>
        <button onclick="window.auraStore.removeFromCart('${item.id}', '${item.size}')" style="border:none;background:none;color:var(--color-destructive);cursor:pointer;padding:4px;" title="حذف">✕</button>
      </div>
    `).join('');

    totalEl.textContent = this.formatPrice(this.getCartTotal());
  }

  openCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
    }
  }

  closeCart() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
    }
  }

  showToast(message) {
    let toast = document.getElementById('aura-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'aura-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: #1C1917;
        color: #FFFFFF;
        border: 1px solid var(--color-accent);
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 2000;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
        gap: 10px;
      `;
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>✨</span> ${message}`;
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      toast.style.transform = 'translateY(100px)';
      toast.style.opacity = '0';
    }, 3200);
  }

  bindEvents() {
    // Theme toggles
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });

    // Cart trigger
    document.querySelectorAll('.cart-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openCart();
      });
    });

    // Cart close
    const closeBtn = document.getElementById('close-cart-btn');
    const overlay = document.getElementById('cart-overlay');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeCart());
    if (overlay) overlay.addEventListener('click', () => this.closeCart());
  }
}

// Global instance
window.auraStore = new AuraStore();
