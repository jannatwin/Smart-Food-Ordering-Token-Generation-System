// Admin dashboard helper functions (shared sidebar rendering, security verification)

const Admin = {
  currentUser: null,

  async init() {
    // 1. Verify credentials and role
    this.currentUser = await API.getCurrentUser();
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      console.warn('[Admin Security] Unauthorized access attempts. Redirecting...');
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // 2. Render Admin Sidebar
    this.renderSidebar();
    
    // 3. Page specific callbacks
    if (typeof onAdminPageLoad === 'function') {
      onAdminPageLoad();
    }
  },

  renderSidebar() {
    const sidebarEl = document.getElementById('admin-sidebar');
    if (!sidebarEl) return;

    const currentPath = window.location.pathname;

    sidebarEl.innerHTML = `
      <div style="padding: 0 1.5rem 1.5rem 1.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;">
        <div style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;"><i class="fas fa-user-shield" style="color: var(--primary);"></i> Admin Portal</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${this.currentUser.full_name}</div>
      </div>
      <ul>
        <li>
          <a href="/admin" class="admin-sidebar-link ${currentPath === '/admin' ? 'active' : ''}">
            <i class="fas fa-chart-line"></i> Dashboard
          </a>
        </li>
        <li>
          <a href="/admin/orders" class="admin-sidebar-link ${currentPath === '/admin/orders' ? 'active' : ''}">
            <i class="fas fa-receipt"></i> Live Orders
          </a>
        </li>
        <li>
          <a href="/admin/foods" class="admin-sidebar-link ${currentPath === '/admin/foods' ? 'active' : ''}">
            <i class="fas fa-hamburger"></i> Manage Foods
          </a>
        </li>
        <li>
          <a href="/admin/categories" class="admin-sidebar-link ${currentPath === '/admin/categories' ? 'active' : ''}">
            <i class="fas fa-tags"></i> Categories
          </a>
        </li>
        <li>
          <a href="/admin/reports" class="admin-sidebar-link ${currentPath === '/admin/reports' ? 'active' : ''}">
            <i class="fas fa-file-invoice-dollar"></i> Sales Reports
          </a>
        </li>
        <li style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
          <a href="/menu" class="admin-sidebar-link" style="color: var(--info);">
            <i class="fas fa-chevron-left"></i> Customer View
          </a>
        </li>
      </ul>
    `;
  }
};

// Auto boot on load
document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});
