// Shared Application Logic (Navbar, Footer, Session, Cart)

// Cart Storage Helper
const Cart = {
  get() {
    try {
      const data = localStorage.getItem('cafeteria_cart');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  save(cart) {
    localStorage.setItem('cafeteria_cart', JSON.stringify(cart));
    // Dispatch custom event to trigger badge update
    window.dispatchEvent(new Event('cartUpdated'));
  },

  add(item, quantity = 1) {
    const cart = this.get();
    const existing = cart.find(i => i.id == item.id);
    
    if (existing) {
      existing.quantity += parseInt(quantity, 10);
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        image: item.image,
        category_name: item.category_name || 'Food',
        quantity: parseInt(quantity, 10)
      });
    }
    
    this.save(cart);
  },

  update(id, quantity) {
    let cart = this.get();
    const item = cart.find(i => i.id == id);
    if (item) {
      item.quantity = parseInt(quantity, 10);
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.id != id);
      }
      this.save(cart);
    }
  },

  remove(id) {
    let cart = this.get();
    cart = cart.filter(i => i.id != id);
    this.save(cart);
  },

  clear() {
    this.save([]);
  },

  count() {
    return this.get().reduce((sum, item) => sum + item.quantity, 0);
  },

  total() {
    return this.get().reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
};

// Global App State
const App = {
  currentUser: null,

  async init() {
    // 1. Fetch current session user status
    this.currentUser = await API.getCurrentUser();
    
    // 2. Render Header and Footer
    this.renderHeader();
    this.renderFooter();

    // 3. Setup Cart Badge Listener
    window.addEventListener('cartUpdated', () => this.updateCartBadge());
    this.updateCartBadge();
  },

  renderHeader() {
    const headerEl = document.getElementById('main-header');
    if (!headerEl) return;

    const currentPath = window.location.pathname;
    const user = this.currentUser;

    let navLinks = `
      <li><a href="/" class="nav-link ${currentPath === '/' ? 'active' : ''}">Home</a></li>
      <li><a href="/menu" class="nav-link ${currentPath === '/menu' ? 'active' : ''}">Menu</a></li>
      <li><a href="/about" class="nav-link ${currentPath === '/about' ? 'active' : ''}">About</a></li>
      <li><a href="/contact" class="nav-link ${currentPath === '/contact' ? 'active' : ''}">Contact</a></li>
      <li><a href="/track" class="nav-link ${currentPath === '/track' ? 'active' : ''}">Track Order</a></li>
    `;

    let actions = '';
    
    if (user) {
      if (user.role === 'admin') {
        actions = `
          <a href="/admin" class="btn btn-primary btn-sm"><i class="fas fa-cog"></i> Admin Panel</a>
          <button id="logout-btn" class="btn btn-secondary btn-sm">Logout</button>
        `;
      } else {
        // Customer
        actions = `
          <a href="/cart" class="cart-trigger" title="View Cart">
            <i class="fas fa-shopping-cart"></i>
            <span class="cart-badge" id="nav-cart-badge">0</span>
          </a>
          <a href="/dashboard" class="btn btn-secondary btn-sm"><i class="fas fa-user"></i> My Account</a>
          <button id="logout-btn" class="btn btn-primary btn-sm">Logout</button>
        `;
      }
    } else {
      // Logged Out
      actions = `
        <a href="/cart" class="cart-trigger" title="View Cart" style="margin-right: 0.5rem;">
          <i class="fas fa-shopping-cart"></i>
          <span class="cart-badge" id="nav-cart-badge">0</span>
        </a>
        <a href="/login" class="btn btn-secondary btn-sm">Login</a>
        <a href="/signup" class="btn btn-primary btn-sm">Sign Up</a>
      `;
    }

    headerEl.innerHTML = `
      <div class="nav-container">
        <div class="logo">
          <a href="/">
            <i class="fas fa-utensils" style="color: var(--primary);"></i>
            Smart<span>Food</span>
          </a>
        </div>
        <button class="mobile-menu-toggle" id="mobile-menu-toggle" type="button" aria-label="Open menu" aria-expanded="false">
          <i class="fas fa-bars"></i>
        </button>
        <nav id="main-nav">
          <ul class="nav-menu">
            ${navLinks}
          </ul>
        </nav>
        <div class="nav-actions">
          ${actions}
        </div>
      </div>
    `;

    // Bind logout button click
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await API.logout();
          Cart.clear(); // Clear customer cart on logout
          window.location.href = '/';
        } catch (e) {
          alert('Failed to log out. Please try again.');
        }
      });
    }

    const menuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    if (menuToggle && mainNav) {
      menuToggle.addEventListener('click', () => {
        const isOpen = headerEl.classList.toggle('nav-open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
        menuToggle.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
      });
    }
  },

  renderFooter() {
    const footerEl = document.getElementById('main-footer');
    if (!footerEl) return;

    footerEl.innerHTML = `
      <div class="container">
        <p>&copy; ${new Date().getFullYear()} <span>SmartFood</span> Ordering System. All rights reserved.</p>
        <p style="font-size: 0.8rem; color: rgba(255,255,255,0.62); margin-top: 0.5rem;">Built for a smooth university cafeteria ordering experience.</p>
        <div class="footer-links">
          <a href="/">Home</a>
          <a href="/menu">Menu</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
        </div>
      </div>
    `;
  },

  updateCartBadge() {
    const badge = document.getElementById('nav-cart-badge');
    if (badge) {
      badge.textContent = Cart.count();
    }
  }
};

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
