document.addEventListener('DOMContentLoaded', () => {
    // Only Admin can view this page
    const role = localStorage.getItem('user_role');
    if (role !== 'Admin') {
        alert("Access Denied. You do not have permission to view this page.");
        window.location.href = 'index.html';
        return;
    }

    loadStaff();

    document.getElementById('add-staff-form').addEventListener('submit', handleAddStaff);

    // Auto-select all permissions if Admin role is chosen
    document.getElementById('role-select').addEventListener('change', (e) => {
        const permsContainer = document.getElementById('permissions-container');
        if(e.target.value === 'Admin') {
            permsContainer.style.opacity = '0.5';
            permsContainer.style.pointerEvents = 'none';
            document.querySelectorAll('.perm-check').forEach(cb => cb.checked = true);
        } else {
            permsContainer.style.opacity = '1';
            permsContainer.style.pointerEvents = 'auto';
        }
    });
});

async function loadStaff() {
    try {
        const res = await fetchData('api/staff.php?action=list');
        if (res && res.status === 'success') {
            const tbody = document.getElementById('staff-list');
            tbody.innerHTML = '';
            res.data.forEach(staff => {
                
                let permsHtml = '';
                if(staff.role === 'Admin') {
                    permsHtml = '<span class="badge" style="background:#ef4444;">Full Access</span>';
                } else {
                    try {
                        const p = JSON.parse(staff.permissions || '[]');
                        permsHtml = p.map(x => `<span class="badge" style="background:#3b82f6; margin:2px;">${x}</span>`).join('');
                        if(p.length === 0) permsHtml = '<span class="badge" style="background:#64748b;">No Access</span>';
                    } catch(e){}
                }

                tbody.innerHTML += `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=e2e8f0&color=475569" style="width:30px; height:30px; border-radius:50%;">
                                <strong>${staff.name}</strong>
                            </div>
                        </td>
                        <td>${staff.email}</td>
                        <td><strong>${staff.role}</strong></td>
                        <td><div style="display:flex; flex-wrap:wrap; max-width:250px;">${permsHtml}</div></td>
                        <td>
                            <button class="btn btn-danger" onclick="deleteStaff(${staff.id})" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">
                                <i class="ph ph-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch(e) {
        showNotification("Failed to load staff list", "error");
    }
}

async function handleAddStaff(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    
    // Gather permissions
    const role = form.querySelector('select[name="role"]').value;
    let permissions = [];
    if(role === 'Admin') {
        permissions = ['all'];
    } else {
        form.querySelectorAll('.perm-check:checked').forEach(cb => {
            permissions.push(cb.value);
        });
    }

    const fd = new FormData(form);
    fd.append('permissions', JSON.stringify(permissions));

    btn.disabled = true;
    btn.innerHTML = 'Creating...';

    try {
        const res = await fetch(API_BASE_URL + 'api/staff.php?action=add', {
            method: 'POST',
            body: fd,
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('auth_token'),
                'ngrok-skip-browser-warning': '69420'
            }
        });
        const json = await res.json();

        if (json.status === 'success') {
            showNotification(json.message, "success");
            closeAddModal();
            form.reset();
            loadStaff();
        } else {
            showNotification(json.message, "error");
        }
    } catch(e) {
        showNotification("Error connecting to server", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
    }
}

async function deleteStaff(id) {
    if(confirm("Are you sure you want to completely delete this user?")) {
        try {
            const fd = new FormData();
            fd.append('id', id);
            
            const res = await fetch(API_BASE_URL + 'api/staff.php?action=delete', {
                method: 'POST',
                body: fd,
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('auth_token'),
                    'ngrok-skip-browser-warning': '69420'
                }
            });
            const json = await res.json();
            
            if (json.status === 'success') {
                showNotification(json.message, "success");
                loadStaff();
            } else {
                showNotification(json.message, "error");
            }
        } catch(e) {
            showNotification("Delete failed", "error");
        }
    }
}

function openAddModal() {
    document.getElementById('add-modal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('add-modal').style.display = 'none';
}
