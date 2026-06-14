// Client API Fetch Wrapper utilities
const API = {
  baseUrl: '',

  // Base request handler
  async request(url, options = {}) {
    // Send credentials (session cookies) automatically
    options.credentials = 'include';
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(this.baseUrl + url, options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }
      return data;
    } catch (error) {
      console.error(`[API Error] Request to ${url} failed:`, error.message);
      throw error;
    }
  },

  // Auth requests
  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  async signup(fullName, email, password) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: { full_name: fullName, email, password }
    });
  },

  async logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  },

  async getCurrentUser() {
    try {
      const res = await this.request('/api/auth/me');
      return res.user;
    } catch (e) {
      return null;
    }
  },

  // Menu items
  async getCategories() {
    return this.request('/api/menu/categories');
  },

  async getMenuItems(categoryId = '', search = '') {
    let query = '';
    const params = [];
    if (categoryId) params.push(`category_id=${categoryId}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) query = '?' + params.join('&');
    return this.request(`/api/menu/items${query}`);
  },

  // Orders
  async placeOrder(cart, paymentMethod = 'Cash', transactionId = '') {
    return this.request('/api/orders/place', {
      method: 'POST',
      body: { cart, payment_method: paymentMethod, transaction_id: transactionId }
    });
  },

  async getMyOrders() {
    return this.request('/api/orders/my-orders');
  },

  async trackOrder(token) {
    return this.request(`/api/orders/track/${token}`);
  },

  // Admin Specific APIs
  async getAdminStats() {
    return this.request('/api/admin/stats');
  },

  async getAdminOrders() {
    return this.request('/api/admin/orders');
  },

  async updateOrderStatus(orderId, status) {
    return this.request(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: { status }
    });
  },

  async getAdminFoods() {
    return this.request('/api/admin/foods');
  },

  async addFood(foodData) {
    return this.request('/api/admin/foods', {
      method: 'POST',
      body: foodData
    });
  },

  async editFood(foodId, foodData) {
    return this.request(`/api/admin/foods/${foodId}`, {
      method: 'PUT',
      body: foodData
    });
  },

  async deleteFood(foodId) {
    return this.request(`/api/admin/foods/${foodId}`, {
      method: 'DELETE'
    });
  },

  async getAdminCategories() {
    return this.request('/api/admin/categories');
  },

  async addCategory(name) {
    return this.request('/api/admin/categories', {
      method: 'POST',
      body: { category_name: name }
    });
  },

  async editCategory(catId, name) {
    return this.request(`/api/admin/categories/${catId}`, {
      method: 'PUT',
      body: { category_name: name }
    });
  },

  async deleteCategory(catId) {
    return this.request(`/api/admin/categories/${catId}`, {
      method: 'DELETE'
    });
  },

  async getSalesReport() {
    return this.request('/api/admin/reports/sales');
  }
};
