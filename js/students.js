function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Fallback to jpeg if type is not supported
                const mimeType = file.type || 'image/jpeg';
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, mimeType, quality);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

// Used for both add_student.html and students.html
document.addEventListener('DOMContentLoaded', () => {
    
    // Add Student Form Submission
    const addForm = document.getElementById('add-student-form');
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = addForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>⏳</span> Saving...';
            submitBtn.disabled = true;

            const formData = new FormData(addForm);
            
            // Client-side image compression to bypass PHP size limits
            const photoInput = document.getElementById('photo');
            if (photoInput && photoInput.files[0]) {
                const file = photoInput.files[0];
                try {
                    const compressedBlob = await compressImage(file, 800, 800, 0.8);
                    // Override the photo field with the compressed blob
                    formData.set('photo', compressedBlob, file.name);
                } catch(e) {
                    console.error("Image compression failed, falling back to original file.", e);
                }
            }
            
            try {
                const response = await fetch(API_BASE_URL + 'api/students.php', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'ngrok-skip-browser-warning': '69420'
                    }
                });
                
                const result = await response.json();
                
                if (result.status === 'success') {
                    showNotification(result.message, 'success');
                    addForm.reset();
                    // Optional: redirect to student profile or list
                    setTimeout(() => {
                        window.location.href = 'students.html';
                    }, 1500);
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                console.error(error);
                showNotification('An error occurred. Check console.', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Edit Student Form Submission
    const editForm = document.getElementById('edit-student-form');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = editForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>⏳</span> Saving...';
            submitBtn.disabled = true;

            const formData = new FormData(editForm);
            
            // Client-side image compression
            const photoInput = document.getElementById('edit-photo');
            if (photoInput && photoInput.files[0]) {
                const file = photoInput.files[0];
                try {
                    const compressedBlob = await compressImage(file, 800, 800, 0.8);
                    formData.set('photo', compressedBlob, file.name);
                } catch(e) {
                    console.error("Image compression failed.", e);
                }
            }
            
            try {
                const response = await fetch(API_BASE_URL + 'api/students.php?action=edit', {
                    method: 'POST',
                    body: formData,
                    headers: { 'ngrok-skip-browser-warning': '69420' }
                });
                
                const result = await response.json();
                if (result.status === 'success') {
                    showNotification(result.message, 'success');
                    closeEditModal();
                    loadStudents(); // Refresh table
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (error) {
                console.error(error);
                showNotification('An error occurred. Check console.', 'error');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Load Students List (students.html)
    const studentsTableBody = document.getElementById('students-tbody');
    if (studentsTableBody) {
        loadStudents();

        // Search functionality
        const searchInput = document.getElementById('search-student');
        if (searchInput) {
            searchInput.addEventListener('input', () => applyFilters());
        }

        // Dropdown filters
        const filterClass = document.getElementById('filter-class');
        const filterGender = document.getElementById('filter-gender');
        const filterStatus = document.getElementById('filter-status');
        if (filterClass) filterClass.addEventListener('change', () => applyFilters());
        if (filterGender) filterGender.addEventListener('change', () => applyFilters());
        if (filterStatus) filterStatus.addEventListener('change', () => applyFilters());

        // Items per page
        const itemsPerPage = document.getElementById('items-per-page');
        if (itemsPerPage) {
            itemsPerPage.addEventListener('change', () => {
                window._studentsPage = 1;
                renderPage();
            });
        }
    }
});

// Global storage for all student data and filtered data
window._allStudents = [];
window._filteredStudents = [];
window._studentsPage = 1;

async function loadStudents() {
    const tbody = document.getElementById('students-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #94a3b8;"><i class="ph ph-spinner" style="font-size:1.5rem;"></i><br>Loading students...</td></tr>`;

    const res = await fetchData('api/students.php?action=list');

    if (res && res.status === 'success') {
        window._allStudents = res.data;

        if (res.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#94a3b8;">No students found.</td></tr>`;
            return;
        }

        // Compute stats
        const total = res.data.length;
        const males = res.data.filter(s => s.gender === 'Male').length;
        const females = res.data.filter(s => s.gender === 'Female').length;
        const classes = new Set(res.data.map(s => s.class)).size;

        const statTotal = document.getElementById('stat-total');
        const statMale = document.getElementById('stat-male');
        const statMalePct = document.getElementById('stat-male-pct');
        const statFemale = document.getElementById('stat-female');
        const statFemalePct = document.getElementById('stat-female-pct');
        const statClasses = document.getElementById('stat-classes');

        if (statTotal) statTotal.textContent = total.toLocaleString();
        if (statMale) statMale.textContent = males.toLocaleString();
        if (statMalePct) statMalePct.textContent = total > 0 ? `${((males/total)*100).toFixed(1)}% of total` : '-';
        if (statFemale) statFemale.textContent = females.toLocaleString();
        if (statFemalePct) statFemalePct.textContent = total > 0 ? `${((females/total)*100).toFixed(1)}% of total` : '-';
        if (statClasses) statClasses.textContent = classes;

        // Populate class dropdown dynamically from student data
        const filterClass = document.getElementById('filter-class');
        if (filterClass) {
            const currentVal = filterClass.value; // preserve selection if re-loading
            const uniqueClasses = [...new Set(res.data.map(s => s.class).filter(Boolean))].sort();
            filterClass.innerHTML = '<option value="">All Classes</option>';
            uniqueClasses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                filterClass.appendChild(opt);
            });
            // Restore previous selection
            if (currentVal) filterClass.value = currentVal;
        }

        applyFilters();
    } else {
        const tbody = document.getElementById('students-tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#ef4444;">Failed to load students.</td></tr>`;
    }
}

function applyFilters() {
    const searchTerm = (document.getElementById('search-student')?.value || '').toLowerCase().trim();
    const filterClass = (document.getElementById('filter-class')?.value || '').trim();
    const filterGender = (document.getElementById('filter-gender')?.value || '').trim();
    // Status filter: 'Active' is the only real option; empty means show all
    // All students are treated as Active for now
    const filterStatus = (document.getElementById('filter-status')?.value || '').trim();

    window._filteredStudents = window._allStudents.filter(s => {
        const matchSearch = !searchTerm ||
            s.full_name.toLowerCase().includes(searchTerm) ||
            s.admission_number.toLowerCase().includes(searchTerm);
        const matchClass = !filterClass || s.class === filterClass;
        const matchGender = !filterGender || s.gender === filterGender;
        // All students are Active; if filter is empty or 'Active', match all
        const matchStatus = !filterStatus || filterStatus === 'Active';
        return matchSearch && matchClass && matchGender && matchStatus;
    });

    window._studentsPage = 1;
    renderPage();
}

function clearFilters() {
    const search = document.getElementById('search-student');
    const fc = document.getElementById('filter-class');
    const fg = document.getElementById('filter-gender');
    const fs = document.getElementById('filter-status');
    if (search) search.value = '';
    if (fc) fc.value = '';
    if (fg) fg.value = '';
    if (fs) fs.value = '';
    applyFilters();
}

function renderPage() {
    const tbody = document.getElementById('students-tbody');
    if (!tbody) return;

    const perPage = parseInt(document.getElementById('items-per-page')?.value || '10');
    const page = window._studentsPage;
    const data = window._filteredStudents;
    const total = data.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const pageData = data.slice(start, start + perPage);

    tbody.innerHTML = '';

    if (pageData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:#94a3b8;">No students match your filters.</td></tr>`;
    } else {
        pageData.forEach(s => {
            const photoSrc = s.photo
                ? (API_BASE_URL + s.photo)
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=e0e7ff&color=4f46e5&size=40`;

            // Generate a placeholder email from the name
            const email = s.full_name.toLowerCase().replace(/\s+/g, '.') + '@email.com';

            // Format created_at date
            let dateAdded = '-';
            if (s.created_at) {
                const d = new Date(s.created_at);
                dateAdded = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            }

            const genderIcon = s.gender === 'Male'
                ? `<i class="ph ph-gender-male" style="color: #3b82f6;"></i>`
                : `<i class="ph ph-gender-female" style="color: #ec4899;"></i>`;
            const genderColor = s.gender === 'Male' ? '#eff6ff' : '#fdf4ff';
            const genderTextColor = s.gender === 'Male' ? '#1d4ed8' : '#9333ea';

            const tr = document.createElement('tr');
            tr.style.cssText = 'background: white; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);';
            tr.innerHTML = `
                <td style="padding: 1rem 1rem; border: none; border-radius: 10px 0 0 10px;">
                    <img src="${photoSrc}" alt="${s.full_name}"
                        style="width:42px; height:42px; border-radius:50%; object-fit:cover; background:#e0e7ff; border: 2px solid #e2e8f0;"
                        onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=e0e7ff&color=4f46e5&size=40'">
                </td>
                <td style="padding: 1rem 0.5rem; border: none;">
                    <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem;">${s.full_name}</div>
                    <div style="color: #94a3b8; font-size: 0.8rem; margin-top: 2px;">${email}</div>
                </td>
                <td style="padding: 1rem 0.5rem; border: none; color: #3b82f6; font-weight: 600; font-size: 0.9rem;">${s.admission_number}</td>
                <td style="padding: 1rem 0.5rem; border: none; color: #475569; font-weight: 500; font-size: 0.9rem;">${s.class}</td>
                <td style="padding: 1rem 0.5rem; border: none;">
                    <span style="display: inline-flex; align-items: center; gap: 0.3rem; background: ${genderColor}; color: ${genderTextColor}; padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600;">
                        ${genderIcon} ${s.gender}
                    </span>
                </td>
                <td style="padding: 1rem 0.5rem; border: none;">
                    <span style="display: inline-flex; align-items: center; gap: 0.3rem; background: #ecfdf5; color: #059669; padding: 0.3rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600;">
                        <span style="width:6px; height:6px; border-radius:50%; background: #10b981; display:inline-block;"></span> Active
                    </span>
                </td>
                <td style="padding: 1rem 0.5rem; border: none; color: #64748b; font-size: 0.88rem;">${dateAdded}</td>
                <td style="padding: 1rem 1rem; border: none; border-radius: 0 10px 10px 0;">
                    <div style="display: flex; align-items: center; gap: 0.4rem; justify-content: center;">
                        <button title="View Profile" onclick="viewProfile(${s.id})"
                            style="width:32px; height:32px; border-radius:7px; border:none; background:#eff6ff; color:#3b82f6; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem;">
                            <i class="ph ph-eye"></i>
                        </button>
                        <button title="Edit Student" onclick="editStudent(${s.id})"
                            style="width:32px; height:32px; border-radius:7px; border:none; background:#fff7ed; color:#f97316; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem;">
                            <i class="ph ph-pencil"></i>
                        </button>
                        <button title="Delete Student" onclick="deleteStudent(${s.id})"
                            style="width:32px; height:32px; border-radius:7px; border:none; background:#fef2f2; color:#ef4444; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem;">
                            <i class="ph ph-trash"></i>
                        </button>
                        <button title="More Options" onclick="showMoreOptions(event, '${s.qr_code}')"
                            style="width:32px; height:32px; border-radius:7px; border:none; background:#f8fafc; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1rem;">
                            <i class="ph ph-dots-three-vertical"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Update pagination info
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        const from = total === 0 ? 0 : start + 1;
        const to = Math.min(start + perPage, total);
        paginationInfo.textContent = `Showing ${from} to ${to} of ${total.toLocaleString()} students`;
    }

    // Build pagination controls
    const paginationControls = document.getElementById('pagination-controls');
    if (paginationControls) {
        paginationControls.innerHTML = '';

        const btnStyle = (active) => `
            width: 36px; height: 36px; border-radius: 8px; border: 1px solid ${active ? '#3b82f6' : '#e2e8f0'};
            background: ${active ? '#3b82f6' : 'white'}; color: ${active ? 'white' : '#64748b'};
            font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center;
            font-size: 0.9rem;
        `;

        // Prev button
        const prevBtn = document.createElement('button');
        prevBtn.innerHTML = '<i class="ph ph-caret-left"></i>';
        prevBtn.style.cssText = btnStyle(false);
        prevBtn.disabled = page === 1;
        prevBtn.style.opacity = page === 1 ? '0.4' : '1';
        prevBtn.onclick = () => { window._studentsPage--; renderPage(); };
        paginationControls.appendChild(prevBtn);

        // Page number buttons (max 5 visible)
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

        for (let i = startPage; i <= endPage; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.style.cssText = btnStyle(i === page);
            btn.onclick = ((pageNum) => () => { window._studentsPage = pageNum; renderPage(); })(i);
            paginationControls.appendChild(btn);
        }

        if (endPage < totalPages) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.cssText = 'padding: 0 0.3rem; color: #94a3b8; line-height: 36px;';
            paginationControls.appendChild(dots);

            const lastBtn = document.createElement('button');
            lastBtn.textContent = totalPages;
            lastBtn.style.cssText = btnStyle(false);
            lastBtn.onclick = () => { window._studentsPage = totalPages; renderPage(); };
            paginationControls.appendChild(lastBtn);
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.innerHTML = '<i class="ph ph-caret-right"></i>';
        nextBtn.style.cssText = btnStyle(false);
        nextBtn.disabled = page === totalPages || totalPages === 0;
        nextBtn.style.opacity = (page === totalPages || totalPages === 0) ? '0.4' : '1';
        nextBtn.onclick = () => { window._studentsPage++; renderPage(); };
        paginationControls.appendChild(nextBtn);
    }
}

function showMoreOptions(event, qrCode) {
    event.stopPropagation();
    // Simple mark present shortcut from the dots menu
    const existing = document.getElementById('more-options-dropdown');
    if (existing) existing.remove();

    const dropdown = document.createElement('div');
    dropdown.id = 'more-options-dropdown';
    dropdown.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        z-index: 9999;
        min-width: 180px;
        padding: 0.5rem 0;
    `;
    dropdown.innerHTML = `
        <div onclick="markPresent('${qrCode}'); this.parentElement.remove();"
            style="padding: 0.6rem 1rem; cursor:pointer; display:flex; align-items:center; gap:0.5rem; color:#059669; font-weight:500; font-size:0.9rem;">
            <i class="ph ph-check-circle"></i> Mark Present
        </div>
    `;

    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + 5) + 'px';
    dropdown.style.left = (rect.left - 120) + 'px';
    document.body.appendChild(dropdown);
    document.addEventListener('click', () => dropdown.remove(), { once: true });
}

async function viewProfile(id) {
    // Show modal or redirect to profile page. Let's use a modal for premium feel.
    // For simplicity, we can dynamically create a modal
    let modal = document.getElementById('profile-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.style.cssText = `
            position: fixed; top:0; left:0; width:100%; height:100%;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(5px);
            z-index: 1000; display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.3s; pointer-events: none;
        `;
        
        modal.innerHTML = `
            <div class="glass-card" style="width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; position: relative;">
                <button onclick="closeProfile()" style="position: absolute; right: 15px; top: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--danger);">&times;</button>
                <div id="profile-content">Loading...</div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.pointerEvents = 'auto';
    modal.style.opacity = '1';
    
    document.getElementById('profile-content').innerHTML = '<div style="text-align:center; padding: 2rem;">Loading profile...</div>';
    
    const res = await fetchData(`api/students.php?action=get&id=${id}`);
    if (res && res.status === 'success') {
        const s = res.data;
        const photoSrc = s.photo ? (API_BASE_URL + s.photo) : 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2280%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ccc%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2021v-2a4%204%200%200%200-4-4H8a4%204%200%200%200-4%204v2%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%227%22%20r%3D%224%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E';
        
        const student = res.data;
        const photoSrc = student.photo ? (API_BASE_URL + student.photo) : 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2280%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ccc%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2021v-2a4%204%200%200%200-4-4H8a4%204%200%200%200-4%204v2%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%227%22%20r%3D%224%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E';
        
        const imgHtml = `<img src="${photoSrc}" alt="${student.full_name}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);background:#f0f0f0;">`;
        let infoHtml = `
        <div style="flex: 1; min-width: 250px;">
            <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong style="color:var(--text-main);">Name:</strong> <span style="color:var(--text-muted);">${student.full_name}</span></p>
            <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong style="color:var(--text-main);">Admission No:</strong> <span style="color:var(--text-muted);">${student.admission_number}</span></p>
            <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong style="color:var(--text-main);">Class/Grade:</strong> <span style="color:var(--text-muted);">${student.class}</span></p>
            <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong style="color:var(--text-main);">Gender:</strong> <span style="color:var(--text-muted);">${student.gender}</span></p>
            <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong style="color:var(--text-main);">Date of Birth:</strong> <span style="color:var(--text-muted);">${student.dob || 'N/A'}</span></p>
            <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong style="color:var(--text-main);">Blood Group:</strong> <span style="color:var(--text-muted);">${student.blood_group || 'N/A'}</span></p>
            <p style="margin: 0.5rem 0; font-size: 1.1rem;"><strong style="color:var(--text-main);">Emergency Contact:</strong> <span style="color:var(--text-muted);">${student.emergency_contact || 'N/A'}</span></p>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; gap: 1rem; border-left: 1px solid var(--border-color); padding-left: 2rem;">
            <div id="qrcode-container" style="display:inline-block; padding: 10px; background: white; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);"></div>
        </div>
        `;

        document.getElementById('profile-content').innerHTML = `
            <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
                ${imgHtml}
                ${infoHtml}
            </div>
            
            <div style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="editStudent(${student.id})"><i class="ph ph-pencil-simple"></i> Edit Student</button>
                <button class="btn" style="background:#10b981; color:white;" onclick="printIDCard(${student.id})"><i class="ph ph-printer"></i> Print ID Card</button>
                <button class="btn btn-danger" onclick="deleteStudent(${student.id})"><i class="ph ph-trash"></i> Delete Student</button>
            </div>
        `;

        // Generate QR Code
        new QRCode(document.getElementById("qrcode-container"), {
            text: student.qr_code,
            width: 150,
            height: 150,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

    } else {
        document.getElementById('profile-content').innerHTML = `<div style="text-align:center;color:red;">Error loading profile.</div>`;
    }
}

function closeProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
    }
}

async function printIDCard(studentId) {
    const student = window._allStudents.find(s => s.id == studentId);
    if (!student) return;
    
    const qrContainer = document.getElementById('qrcode-container');
    const qrImg = qrContainer.querySelector('img').src;
    const photoSrc = student.photo ? (API_BASE_URL + student.photo) : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(student.full_name);
    
    // Open window immediately to prevent popup blocker
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write('Loading ID Card...');
    
    // Fetch settings
    let settings = {};
    try {
        const res = await fetch(API_BASE_URL + 'api/settings.php?action=get', { headers: { 'ngrok-skip-browser-warning': '69420' }});
        const json = await res.json();
        if (json.status === 'success') {
            settings = json.data;
        }
    } catch(e) { console.error(e); }
    
    const schoolName = settings.school_name || "Sunrise High School";
    const schoolMotto = settings.school_motto || "Excellence • Discipline • Integrity";
    const schoolLogo = settings.school_logo ? (API_BASE_URL + settings.school_logo) : "";
    const schoolWebsite = settings.school_website || "www.yourschool.com";
    const accentColor = settings.accent_color || "#4f46e5";

    const logoHtml = schoolLogo ? `<img src="${schoolLogo}" style="height: 40px; margin-right: 10px; border-radius: 50%;">` : '';

    const htmlContent = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Print ID Card - ${student.full_name}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    body { 
                        font-family: 'Inter', sans-serif; 
                        margin: 0; 
                        padding: 20px; 
                        background: #f1f5f9;
                        display: flex;
                        gap: 20px;
                        justify-content: center;
                    }
                    .id-card {
                        width: 210px; /* Standard CR80 width */
                        height: 330px;
                        background: white;
                        border-radius: 10px;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        position: relative;
                    }
                    /* FRONT CARD */
                    .card-header {
                        background: ${accentColor};
                        color: white;
                        padding: 15px 10px;
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        height: 70px;
                    }
                    .school-header-row {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                    }
                    .school-name {
                        font-weight: 700;
                        font-size: 13px;
                        line-height: 1.1;
                    }
                    .school-motto {
                        font-size: 8px;
                        opacity: 0.9;
                        margin-top: 3px;
                        letter-spacing: 0.5px;
                    }
                    .photo-container {
                        text-align: center;
                        margin-top: -30px;
                        z-index: 2;
                    }
                    .student-photo {
                        width: 80px;
                        height: 80px;
                        border-radius: 50%;
                        border: 3px solid white;
                        object-fit: cover;
                        background: white;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    .student-name {
                        text-align: center;
                        font-weight: 700;
                        font-size: 15px;
                        margin-top: 5px;
                        color: #1e293b;
                    }
                    .student-class {
                        text-align: center;
                        font-size: 11px;
                        color: ${accentColor};
                        font-weight: 600;
                        margin-bottom: 10px;
                    }
                    .info-grid {
                        padding: 0 15px;
                        font-size: 9px;
                        flex: 1;
                    }
                    .info-row {
                        display: flex;
                        margin-bottom: 5px;
                    }
                    .info-label {
                        color: #64748b;
                        width: 60px;
                        font-weight: 600;
                    }
                    .info-value {
                        color: #0f172a;
                        font-weight: 600;
                    }

                    /* BACK CARD */
                    .back-header {
                        background: ${accentColor};
                        color: white;
                        text-align: center;
                        padding: 10px;
                        font-weight: 700;
                        font-size: 12px;
                        letter-spacing: 1px;
                    }
                    .back-body {
                        padding: 15px;
                        font-size: 9px;
                        color: #334155;
                        text-align: center;
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                    }
                    .terms {
                        margin-bottom: 10px;
                        line-height: 1.4;
                    }
                    .emergency {
                        background: #fee2e2;
                        color: #b91c1c;
                        padding: 8px;
                        border-radius: 5px;
                        margin-bottom: 15px;
                        font-weight: 600;
                    }
                    .barcode-container {
                        text-align: center;
                        margin-top: auto;
                        margin-bottom: 10px;
                    }
                    .barcode-container svg {
                        max-width: 100%;
                        height: 35px;
                    }
                    .qr-container {
                        position: absolute;
                        bottom: 30px;
                        right: 10px;
                    }
                    .qr-container img {
                        width: 45px;
                        height: 45px;
                    }
                    .footer {
                        background: #0f172a;
                        color: white;
                        text-align: center;
                        padding: 6px;
                        font-size: 8px;
                        position: absolute;
                        bottom: 0;
                        width: 100%;
                    }

                    @media print {
                        body { 
                            background: white; 
                            padding: 0;
                            gap: 10px;
                        }
                        .id-card { box-shadow: none; border: 1px solid #ccc; }
                        button { display: none; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body>
                <!-- Front -->
                <div class="id-card">
                    <div class="card-header">
                        <div class="school-header-row">
                            ${logoHtml}
                            <div class="school-name">${schoolName}</div>
                        </div>
                        <div class="school-motto">${schoolMotto}</div>
                    </div>
                    <div class="photo-container">
                        <img src="${photoSrc}" class="student-photo" alt="Photo">
                    </div>
                    <div class="student-name">${student.full_name}</div>
                    <div class="student-class">${student.class}</div>
                    
                    <div class="info-grid">
                        <div class="info-row">
                            <span class="info-label">Adm No:</span>
                            <span class="info-value">${student.admission_number}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">D.O.B:</span>
                            <span class="info-value">${student.dob || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Blood Grp:</span>
                            <span class="info-value" style="color: #e11d48;">${student.blood_group || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Admitted:</span>
                            <span class="info-value">${student.admitted_date || 'N/A'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Valid Until:</span>
                            <span class="info-value">${student.valid_until || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <!-- Back -->
                <div class="id-card">
                    <div class="back-header">STUDENT ID CARD</div>
                    <div class="back-body">
                        <div class="terms">
                            This card is the property of ${schoolName}. It must be worn at all times while on school premises. 
                            If found, please return to the school administration.
                        </div>
                        <div class="emergency">
                            In case of emergency, contact:<br>
                            <span style="font-size: 11px;">${student.emergency_contact || 'N/A'}</span>
                        </div>
                        
                        <div class="barcode-container">
                            <svg id="barcode"></svg>
                        </div>
                    </div>
                    
                    <div class="qr-container">
                        <img src="${qrImg}" alt="QR">
                    </div>

                    <div class="footer">
                        ${schoolWebsite}
                    </div>
                </div>

                <div style="position: fixed; top: 20px; right: 20px;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: ${accentColor}; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        <svg style="width:16px; height:16px; vertical-align:middle; margin-right:5px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Print ID Card
                    </button>
                </div>

                <script>
                    // Render Barcode
                    JsBarcode("#barcode", "${student.admission_number}", {
                        format: "CODE128",
                        width: 1.5,
                        height: 30,
                        displayValue: true,
                        fontSize: 12,
                        margin: 0
                    });
                    
                    // Auto open print dialog after a slight delay for images/fonts to load
                    setTimeout(() => {
                        window.print();
                    }, 500);
                </script>
            </body>
        </html>
    `;
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

function openPdfModal() {
    const modal = document.getElementById('pdf-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }
}

function closePdfModal() {
    const modal = document.getElementById('pdf-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
            // Reset button states in case they were left loading
            document.getElementById('btn-pdf-all').innerHTML = '<i class="ph ph-users-three" style="font-size: 1.5rem; margin-right: 0.5rem;"></i><div><strong style="display: block;">All Students</strong><span style="font-size: 0.8rem; font-weight: normal; opacity: 0.9;">Complete directory of all registered students</span></div>';
            document.getElementById('btn-pdf-present').innerHTML = '<i class="ph ph-check-circle" style="font-size: 1.5rem; margin-right: 0.5rem;"></i><div><strong style="display: block;">Present Today</strong><span style="font-size: 0.8rem; font-weight: normal; opacity: 0.9;">Students who have already checked in today</span></div>';
            document.getElementById('btn-pdf-absent').innerHTML = '<i class="ph ph-x-circle" style="font-size: 1.5rem; margin-right: 0.5rem;"></i><div><strong style="display: block;">Absent Today</strong><span style="font-size: 0.8rem; font-weight: normal; opacity: 0.9;">Students who have not yet checked in today</span></div>';
        }, 300);
    }
}

// Helper function to generate QR Code as DataURL
function generateQRCodeBase64(text) {
    return new Promise((resolve) => {
        const tempDiv = document.createElement('div');
        new QRCode(tempDiv, {
            text: text,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.L
        });
        
        // Wait a tiny bit for the canvas to render
        setTimeout(() => {
            const canvas = tempDiv.querySelector('canvas');
            if (canvas) {
                resolve(canvas.toDataURL("image/png"));
            } else {
                resolve(null);
            }
        }, 50);
    });
}

async function downloadStudentsPDF(filterType = 'all') {
    const btnId = 'btn-pdf-' + filterType;
    const btn = document.getElementById(btnId);
    
    if (btn) {
        btn.innerHTML = '<i class="ph ph-spinner ph-spin" style="font-size: 1.5rem; margin-right: 0.5rem;"></i><div><strong style="display: block;">Generating...</strong></div>';
    }

    try {
        // Fetch all students
        const resStudents = await fetchData('api/students.php?action=list');
        if (!resStudents || resStudents.status !== 'success' || resStudents.data.length === 0) {
            showNotification('No students found in the database.', 'error');
            closePdfModal();
            return;
        }

        let finalData = resStudents.data;
        let reportSubtitle = 'All Registered Students';

        // Fetch attendance for filtering
        if (filterType !== 'all') {
            const today = new Date().toISOString().split('T')[0];
            const resAttendance = await fetchData(`api/attendance.php?action=records&date=${today}`);
            
            const presentStudentIds = new Set();
            if (resAttendance && resAttendance.status === 'success') {
                resAttendance.data.forEach(record => {
                    // Extract student ID from the record (wait, records returns full details, but doesn't explicitly return student_id, only 'id' which is attendance ID. Let's match by admission_number)
                    presentStudentIds.add(record.admission_number);
                });
            }

            if (filterType === 'present') {
                finalData = resStudents.data.filter(s => presentStudentIds.has(s.admission_number));
                reportSubtitle = `Present Students - ${today}`;
            } else if (filterType === 'absent') {
                finalData = resStudents.data.filter(s => !presentStudentIds.has(s.admission_number));
                reportSubtitle = `Absent Students - ${today}`;
            }
        }

        if (finalData.length === 0) {
            showNotification(`No students match the filter "${filterType}".`, 'error');
            closePdfModal();
            return;
        }

        // Generate QR Code data URLs for all filtered students
        for (let s of finalData) {
            s.qrBase64 = await generateQRCodeBase64(s.qr_code);
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // Header background
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 297, 28, 'F');

        // School name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('EduGate School System', 14, 13);

        // Report title
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Student Directory Report - ${reportSubtitle}`, 14, 21);

        // Date on right
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.setFontSize(9);
        doc.text(`Generated: ${dateStr}`, 297 - 14, 21, { align: 'right' });

        // Table Data
        const tableData = finalData.map((s, i) => [
            i + 1,
            s.full_name || '-',
            s.admission_number || '-',
            s.class || '-',
            s.gender || '-',
            s.phone || '-',
            s.email || '-',
            '', // Placeholder for QR code image
        ]);

        doc.autoTable({
            startY: 32,
            head: [['#', 'Full Name', 'Adm No.', 'Class', 'Gender', 'Phone', 'Email', 'QR Code']],
            body: tableData,
            styles: { fontSize: 8.5, cellPadding: 4, textColor: [40, 40, 40], valign: 'middle' },
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 248, 255] },
            bodyStyles: { minCellHeight: 18 }, // Make row taller to fit QR code
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 45 },
                2: { cellWidth: 25 },
                3: { cellWidth: 22 },
                4: { cellWidth: 20 },
                5: { cellWidth: 30 },
                6: { cellWidth: 45 },
                7: { cellWidth: 25, halign: 'center' }
            },
            margin: { left: 14, right: 14 },
            didDrawCell: function (data) {
                // Check if it's the QR Code column (index 7) in the body
                if (data.column.index === 7 && data.section === 'body') {
                    const student = finalData[data.row.index];
                    if (student && student.qrBase64) {
                        // Draw the image: doc.addImage(imageData, format, x, y, width, height)
                        // Center it in the cell
                        const dim = 16;
                        const x = data.cell.x + (data.cell.width - dim) / 2;
                        const y = data.cell.y + (data.cell.height - dim) / 2;
                        doc.addImage(student.qrBase64, 'PNG', x, y, dim, dim);
                    }
                }
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFillColor(79, 70, 229);
            doc.rect(0, doc.internal.pageSize.height - 10, 297, 10, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(255, 255, 255);
            doc.text(`EduGate School System — Confidential`, 14, doc.internal.pageSize.height - 3);
            doc.text(`Page ${i} of ${pageCount}`, 297 - 14, doc.internal.pageSize.height - 3, { align: 'right' });
        }

        doc.save(`Students_Directory_${filterType}_${now.toISOString().slice(0, 10)}.pdf`);
        showNotification(`PDF exported with ${finalData.length} students!`, 'success');

    } catch (e) {
        console.error("PDF Error:", e);
        showNotification("Failed to generate PDF.", 'error');
    }

    closePdfModal();
}

// Edit and Delete functions
async function editStudent(id) {
    const res = await fetchData(`api/students.php?action=get&id=${id}`);
    if (res && res.status === 'success') {
        const s = res.data;
        document.getElementById('edit-id').value = s.id;
        document.getElementById('edit-full-name').value = s.full_name;
        document.getElementById('edit-admission-number').value = s.admission_number;
        document.getElementById('edit-class').value = s.class;
        
        if (document.getElementById('edit-gender')) document.getElementById('edit-gender').value = s.gender;
        if (document.getElementById('edit-dob')) document.getElementById('edit-dob').value = s.dob || '';
        if (document.getElementById('edit-blood_group')) document.getElementById('edit-blood_group').value = s.blood_group || '';
        if (document.getElementById('edit-emergency_contact')) document.getElementById('edit-emergency_contact').value = s.emergency_contact || '';
        if (document.getElementById('edit-admitted_date')) document.getElementById('edit-admitted_date').value = s.admitted_date || '';
        if (document.getElementById('edit-valid_until')) document.getElementById('edit-valid_until').value = s.valid_until || '';

        document.getElementById('edit-photo').value = ''; // Reset file input
        
        const modal = document.getElementById('edit-modal');
        modal.style.display = 'flex';
        // Allow tiny delay for display:flex to apply before transition
        setTimeout(() => modal.style.pointerEvents = 'auto', 10);
    } else {
        showNotification("Failed to load student data.", "error");
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.style.pointerEvents = 'none';
    modal.style.display = 'none';
}

async function deleteStudent(id) {
    if (confirm("WARNING: Are you sure you want to completely delete this student? All their attendance records will be permanently erased. This cannot be undone!")) {
        try {
            const formData = new FormData();
            formData.append('id', id);
            const response = await fetch(API_BASE_URL + 'api/students.php?action=delete', {
                method: 'POST',
                body: formData,
                headers: { 'ngrok-skip-browser-warning': '69420' }
            });
            const result = await response.json();
            if (result.status === 'success') {
                showNotification(result.message, 'success');
                loadStudents();
            } else {
                showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error(error);
            showNotification('Failed to delete student.', 'error');
        }
    }
}

async function markPresent(qrCode) {
    try {
        const formData = new FormData();
        formData.append('qr_code', qrCode);
        const response = await fetch(API_BASE_URL + 'api/attendance.php?action=scan', {
            method: 'POST',
            body: formData,
            headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        const result = await response.json();
        if (result.status === 'success') {
            showNotification("Student marked as present!", 'success');
        } else if (result.status === 'duplicate') {
            showNotification(result.message, 'warning'); // "Student already scanned today"
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        showNotification('Failed to mark student as present.', 'error');
    }
}
