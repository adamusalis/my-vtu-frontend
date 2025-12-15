/* main.js
   Connects FastVTU Frontend to Django Backend on Render.
*/

const API = {
    // 1. YOUR LIVE BACKEND URL
    baseURL: 'https://kdc-u00n.onrender.com',

    // --- HELPER FUNCTIONS ---

    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('user') || '{}');
    },

    // --- AUTHENTICATION ---

    async login(username, password) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok) {
                // Save Token & User Info
                localStorage.setItem('token', data.access || data.token);
                // Save user details (fallback to username if full object missing)
                localStorage.setItem('user', JSON.stringify(data.user || { username: username }));
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.detail || 'Invalid credentials' };
            }
        } catch (error) {
            console.error("Login Error:", error);
            return { success: false, message: 'Server connection failed.' };
        }
    },

    async register(userData) {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await response.json();
           
            if (response.ok) {
                return { success: true, message: 'Registration successful!' };
            }
            const errorMsg = typeof data === 'object' ? JSON.stringify(data) : 'Registration failed';
            return { success: false, message: errorMsg };
        } catch (error) {
            return { success: false, message: 'Network error.' };
        }
    },

    // --- DASHBOARD & PROFILE ---

    async getDashboardData() {
        try {
            const response = await fetch(`${this.baseURL}/api/auth/profile/`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const data = await response.json();

            if (response.ok) {
                return {
                    balance: data.balance || 0.00,
                    totalTransactions: data.total_transactions || 0,
                    servicesUsed: data.services_count || 0,
                    recentTransactions: [] // Real history fetched separately if needed
                };
            }
            return null;
        } catch (error) {
            console.error("Dashboard Error:", error);
            return null;
        }
    },

    // --- SERVICES (Airtime, Data, TV, Electricity) ---

    async buyAirtime(network, phone, amount) {
        try {
            const response = await fetch(`${this.baseURL}/api/services/airtime/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ network, phone, amount })
            });
            const data = await response.json();
           
            if (response.ok) return { success: true, message: 'Airtime sent successfully!' };
            return { success: false, message: data.detail || 'Transaction failed.' };
        } catch (error) {
            return { success: false, message: 'Network error.' };
        }
    },

    async buyData(network, phone, plan_id) {
        try {
            const response = await fetch(`${this.baseURL}/api/services/data/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ network, phone, plan_id })
            });
            const data = await response.json();
           
            if (response.ok) return { success: true, message: 'Data sent successfully!' };
            return { success: false, message: data.detail || 'Transaction failed.' };
        } catch (error) {
            return { success: false, message: 'Network error.' };
        }
    },

    async purchaseTV(provider, smartcard, bouquet_code, pin) {
        try {
            const response = await fetch(`${this.baseURL}/api/services/tv/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ provider, smartcard_number: smartcard, plan_code: bouquet_code, pin })
            });
            const data = await response.json();
           
            if (response.ok) return { success: true, message: 'Subscription successful!' };
            return { success: false, message: data.detail || 'Transaction failed.' };
        } catch (error) {
            return { success: false, message: 'Network error.' };
        }
    },

    async purchaseElectricity(provider, meter_number, amount, pin) {
        try {
            const response = await fetch(`${this.baseURL}/api/services/electricity/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ provider, meter_number, amount, pin })
            });
            const data = await response.json();
           
            if (response.ok) return { success: true, message: 'Payment successful! Token: ' + (data.token || 'Sent via SMS') };
            return { success: false, message: data.detail || 'Transaction failed.' };
        } catch (error) {
            return { success: false, message: 'Network error.' };
        }
    },

    // --- TRANSACTIONS & WALLET ---

    async fundWallet(amount, method) {
        try {
            const response = await fetch(`${this.baseURL}/api/transaction/deposit/`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ amount, method })
            });
            const data = await response.json();
           
            if (response.ok) return { success: true, message: data.message || 'Funding successful!' };
            return { success: false, message: data.detail || 'Funding failed.' };
        } catch (error) {
            return { success: false, message: 'Connection error.' };
        }
    },

    async getTransactions() {
        try {
            const response = await fetch(`${this.baseURL}/api/transaction/history/`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const data = await response.json();
           
            if (response.ok) {
                return Array.isArray(data) ? data : (data.results || []);
            }
            return [];
        } catch (error) {
            return [];
        }
    },

    // --- ADMIN FUNCTIONS ---

    async getAllUsers() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/users/`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            const data = await response.json();
            if (response.ok) return Array.isArray(data) ? data : (data.results || []);
            return [];
        } catch (error) { return []; }
    },

    async deleteUser(userId) {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/users/${userId}/`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });
            return response.ok;
        } catch (error) { return false; }
    }
};

// --- UI UTILITIES (Toast, Page Protection) ---

// Toast Notifications
function showToast(message, type = 'success', duration = 3000) {
    let toastContainer = document.getElementById('toastContainer');
   
    // Create container if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
   
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
   
    toastContainer.appendChild(toast);
   
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Global Auth Check & UI Updates
function checkAuth() {
    // List of pages that DO NOT require login
    const publicPages = ['login', 'register', 'index', ''];
    const pathParts = window.location.pathname.split('/');
    const currentPage = pathParts[pathParts.length - 1].split('.')[0];
   
    // Redirect to login if on protected page and not logged in
    if (!publicPages.includes(currentPage) && !API.isAuthenticated()) {
        if (!window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
}

// Run checks when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Update User Name in Navbar if element exists
    const user = API.getCurrentUser();
    const nameEl = document.getElementById('userName');
    if (nameEl && (user.username || user.first_name)) {
        nameEl.textContent = user.first_name || user.username;
    }
});