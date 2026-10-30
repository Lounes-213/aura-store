// AURA Haute Couture - Master Multilingual & Multi-theme Store Controller

class AuraStore {
  constructor() {
    this.lang = localStorage.getItem('aura_lang') || 'ar';
    this.theme = localStorage.getItem('aura_theme') || 'light';
    this.cart = JSON.parse(localStorage.getItem('aura_cart') || '[]');
    this.products = [];
    this.init();
  }

  async init() {
    this.applyTheme(this.theme);
    this.applyLanguage(this.lang, false);
    await this.loadProducts();
    this.updateCartBadge();
    this.renderCartDrawer();
    this.bindEvents();
    this.refreshPageTexts();
  }

  async loadProducts() {
    if (window.AURA_EMBEDDED_PRODUCTS && window.AURA_EMBEDDED_PRODUCTS.length) {
      this.products = window.AURA_EMBEDDED_PRODUCTS;
    } else {
      try {
        const res = await fetch('./data/products.json');
        this.products = await res.json();
      } catch (e) {
        console.error('Products load fallback error:', e);
      }
    }
  }

  get t() {
    const dict = window.AURA_TRANSLATIONS || {};
    return dict[this.lang] || dict['ar'] || {};
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aura_theme', theme);
    this.theme = theme;

    const logoImg = document.querySelector('.site-logo img');
    if (logoImg) {
      logoImg.src = theme === 'dark' ? './assets/icons/logo-light.svg' : './assets/icons/logo.svg';
    }

    const themeIcon = document.querySelector('.theme-toggle svg');
    if (themeIcon) {
      themeIcon.innerHTML = theme === 'dark' 
        ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>' 
        : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
    }
  }

  toggleTheme() {
    this.applyTheme(this.theme === 'light' ? 'dark' : 'light');
  }

  applyLanguage(lang, reRender = true) {
    if (!['ar', 'en', 'fr'].includes(lang)) lang = 'ar';
    this.lang = lang;
    localStorage.setItem('aura_lang', lang);

    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);

    // Update active lang button UI
    document.querySelectorAll('.lang-select-btn span.current-lang').forEach(el => {
      el.textContent = lang.toUpperCase();
    });

    if (reRender) {
      this.refreshPageTexts();
      this.renderCartDrawer();
      if (typeof window.onAuraLanguageChanged === 'function') {
        window.onAuraLanguageChanged(lang);
      }
    }
  }

  cycleLanguage() {
    const sequence = ['ar', 'en', 'fr'];
    const nextIdx = (sequence.indexOf(this.lang) + 1) % sequence.length;
    this.applyLanguage(sequence[nextIdx], true);
  }

  formatPrice(num) {
    const cur = this.t.currency || 'DZD';
    return num.toLocaleString('fr-DZ') + ' ' + cur;
  }

  getLocalized(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[this.lang] || obj['ar'] || obj['en'] || '';
  }

  refreshPageTexts() {
    const t = this.t;
    // Walk over all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const path = el.getAttribute('data-i18n').split('.');
      let val = t;
      for (const k of path) {
        val = val ? val[k] : null;
      }
      if (val) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = val;
        } else {
          el.innerHTML = val;
        }
      }
    });
  }

  addToCart(productId, size = 'M', color = null) {
    const p = this.products.find(x => x.id === productId);
    if (!p) return;

    const existing = this.cart.find(i => i.id === productId && i.size === size);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        size: size,
        color: color || this.getLocalized(p.colors?.[0]?.name) || 'Classic',
        quantity: 1
      });
    }

    this.saveCart();
    this.showToast(this.t.cart?.addedToast || 'Added to bag!');
    this.openCart();
  }

  removeFromCart(productId, size) {
    this.cart = this.cart.filter(i => !(i.id === productId && i.size === size));
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
    const count = this.getCartCount();
    document.querySelectorAll('.cart-count').forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'grid' : 'none';
    });
  }

  renderCartDrawer() {
    const listEl = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    if (!listEl || !totalEl) return;

    const t = this.t.cart || {};

    if (this.cart.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--color-muted-foreground);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <p style="font-size: 1rem; font-weight: 700;">${t.emptyTitle || 'Your Shopping Bag is Empty'}</p>
          <p style="font-size: 0.85rem; margin-top: 0.5rem;">${t.emptySubtitle || 'Explore our creations and select items.'}</p>
        </div>
      `;
      totalEl.textContent = this.formatPrice(0);
      return;
    }

    listEl.innerHTML = this.cart.map(item => `
      <div class="cart-item-row">
        <img src="${item.image}" alt="Item" class="cart-item-img">
        <div class="cart-item-info">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">${this.getLocalized(item.name)}</h4>
          <p style="font-size: 0.75rem; color: var(--color-muted-foreground); margin-bottom: 8px;">
            ${t.size || 'Size'}: <strong>${item.size}</strong> | ${t.color || 'Color'}: <strong>${item.color}</strong>
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
        <button onclick="window.auraStore.removeFromCart('${item.id}', '${item.size}')" style="border:none;background:none;color:var(--color-destructive);cursor:pointer;padding:4px;" title="Delete">✕</button>
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
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });

    document.querySelectorAll('.lang-select-btn').forEach(btn => {
      btn.addEventListener('click', () => this.cycleLanguage());
    });

    document.querySelectorAll('.cart-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openCart();
      });
    });

    const closeBtn = document.getElementById('close-cart-btn');
    const overlay = document.getElementById('cart-overlay');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeCart());
    if (overlay) overlay.addEventListener('click', () => this.closeCart());
  }
}

window.auraStore = new AuraStore();
