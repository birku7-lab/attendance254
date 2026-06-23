// Global Auth Check
(function checkAuth() {
    const isLoginPage = window.location.pathname.endsWith('login.html');
    const token = localStorage.getItem('auth_token');
    
    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
        return; // Stop execution
    }
    
    if (token && !isLoginPage) {
        // Enforce Permissions on Sidebar
        window.addEventListener('DOMContentLoaded', () => {
            const permsRaw = localStorage.getItem('user_permissions') || '[]';
            let permissions = [];
            try { permissions = JSON.parse(permsRaw); } catch(e){}
            
            const role = localStorage.getItem('user_role');
            
            // Render user profile in footer
            const footerInfo = document.querySelector('.sidebar-footer-info');
            if (footerInfo) {
                const userName = localStorage.getItem('user_name') || (role === 'Admin' ? 'Admin' : 'Staff');
                footerInfo.innerHTML = `<h4>${userName}</h4><p>${role}</p>`;
            }

            // If not "all", hide unauthorized links and enforce page access
            if (!permissions.includes('all')) {
                const menuLinks = document.querySelectorAll('.sidebar-menu a');
                menuLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && href !== '#') {
                        const pageName = href.replace('.html', '');
                        if (!permissions.includes(pageName)) {
                            link.parentElement.style.display = 'none';
                        }
                    }
                });

                // Also hide the entire Management/System section if all children are hidden
                document.querySelectorAll('.nav-section').forEach(section => {
                    const visibleLinks = section.querySelectorAll('li:not([style*="display: none"])');
                    if (visibleLinks.length === 0) {
                        section.style.display = 'none';
                    }
                });

                // Page-level protection: check if current page is allowed
                const currentPath = window.location.pathname.split('/').pop() || 'index.html';
                const currentPageName = currentPath.replace('.html', '');
                
                // Allow login.html and empty paths
                if (currentPath !== 'login.html' && currentPath !== '') {
                    if (!permissions.includes(currentPageName)) {
                        // Redirect to the first allowed page, or login if none
                        if (permissions.length > 0) {
                            window.location.href = permissions[0] + '.html';
                        } else {
                            window.location.href = 'login.html';
                        }
                    }
                }
            }
            
            // Add Logout Button
            const sidebarScroll = document.querySelector('.sidebar-scroll');
            if(sidebarScroll) {
                const logoutSection = document.createElement('div');
                logoutSection.className = 'nav-section';
                logoutSection.innerHTML = `<ul class="sidebar-menu"><li><a href="#" id="logout-btn" style="color:#ef4444;"><i class="ph ph-sign-out"></i> Logout</a></li></ul>`;
                sidebarScroll.appendChild(logoutSection);
                
                document.getElementById('logout-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_role');
                    localStorage.removeItem('user_permissions');
                    window.location.href = 'login.html';
                });
            }
        });
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Sidebar Toggle
    const toggleBtn = document.querySelector('.mobile-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Set active menu item
    const currentPath = window.location.pathname.split('/').pop();
    const menuLinks = document.querySelectorAll('.sidebar-menu a');
    menuLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
            link.parentElement.classList.add('active');
        }
    });

    loadSystemSettings();
});

async function loadSystemSettings() {
    try {
        const res = await fetchData('api/settings.php?action=get');
        if (res && res.status === 'success') {
            const settings = res.data;
            window.appSettings = settings;

            // Apply Theme
            if (settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }

            // Apply Accent Color
            const root = document.documentElement;
            const accents = {
                'blue': '#3b82f6',
                'purple': '#8b5cf6',
                'green': '#10b981',
                'orange': '#f59e0b',
                'red': '#ef4444',
                'pink': '#ec4899',
                'teal': '#14b8a6',
                'indigo': '#4f46e5'
            };
            if (settings.accent_color && accents[settings.accent_color]) {
                root.style.setProperty('--primary', accents[settings.accent_color]);
            }
        }
    } catch(e) {
        console.error("Failed to load settings:", e);
    }
}

// Global Notification System
function showNotification(message, type = 'success') {
    if (window.appSettings) {
        if (type === 'success' && window.appSettings.notifications_success === 'false') return;
        if (type === 'error' && window.appSettings.notifications_error === 'false') return;
    }

    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    
    const iconHtml = type === 'success' ? '✅' : (type === 'error' ? '❌' : '⚠️');

    notif.innerHTML = `
        <div class="icon">${iconHtml}</div>
        <div class="content">
            <h4 style="margin: 0; font-size: 14px;">${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
            <p style="margin: 0; font-size: 13px; color: #555;">${message}</p>
        </div>
    `;

    container.appendChild(notif);

    setTimeout(() => {
        notif.classList.add('hide');
        setTimeout(() => {
            if(notif.parentNode) notif.parentNode.removeChild(notif);
        }, 300);
    }, 4000);
}

// Helper to fetch data
async function fetchData(url, options = {}) {
    try {
        const fullUrl = url.startsWith('http') ? url : API_BASE_URL + url;
        const token = localStorage.getItem('auth_token');
        
        options.headers = {
            ...options.headers,
            'ngrok-skip-browser-warning': '69420'
        };
        options.cache = 'no-store';

        let finalUrl = fullUrl;
        try {
            const urlObj = new URL(fullUrl);
            urlObj.searchParams.append('_t', Date.now());
            if (token) urlObj.searchParams.append('token', token); // Pass token in query string to bypass Apache stripping headers
            finalUrl = urlObj.toString();
        } catch(e){}

        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }

        const response = await fetch(finalUrl, options);
        if(!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error('Fetch error:', e);
        showNotification(e.message, 'error');
        return { status: 'error', message: e.message };
    }
}
