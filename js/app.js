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
});

// Global Notification System
function showNotification(message, type = 'success') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    
    let icon = 'CheckCircle';
    if(type === 'error') icon = 'XCircle';
    if(type === 'warning') icon = 'AlertTriangle';

    // Using feather icons placeholder since we haven't loaded feather yet, just use text or simple unicode
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
        const response = await fetch(fullUrl, options);
        if(!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error('Fetch error:', e);
        showNotification(e.message, 'error');
        return { status: 'error', message: e.message };
    }
}
