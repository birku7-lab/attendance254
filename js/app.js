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
        
        options.headers = {
            ...options.headers,
            'ngrok-skip-browser-warning': '69420'
        };

        const response = await fetch(fullUrl, options);
        if(!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error('Fetch error:', e);
        showNotification(e.message, 'error');
        return { status: 'error', message: e.message };
    }
}
