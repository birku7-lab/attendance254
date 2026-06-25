let globalClassExpiries = {};

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initColorPicker();
    loadAllSettings();
    loadHolidays();
    setupFormListeners();
});

function initTabs() {
    const links = document.querySelectorAll('.settings-menu a');
    const sections = document.querySelectorAll('.settings-section');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active from all
            links.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active to clicked
            link.classList.add('active');
            const targetId = link.getAttribute('href').substring(1);
            document.getElementById(targetId).classList.add('active');
        });
    });
}

function initColorPicker() {
    const swatches = document.querySelectorAll('.color-swatch');
    const input = document.getElementById('input-accent-color');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            input.value = swatch.dataset.color;
        });
    });
}

async function loadAllSettings() {
    try {
        const res = await fetchData('api/settings.php?action=get');
        if (res && res.status === 'success') {
            const data = res.data;
            
            // Populate standard inputs
            document.querySelectorAll('input[type="text"], input[type="email"], input[type="time"], input[type="number"], input[type="color"], select, textarea').forEach(input => {
                if (data[input.name] !== undefined) {
                    input.value = data[input.name];
                }
            });
            
            // Populate radio buttons
            document.querySelectorAll('input[type="radio"]').forEach(radio => {
                if (data[radio.name] !== undefined) {
                    if (radio.value === data[radio.name]) {
                        radio.checked = true;
                    }
                }
            });

            // Populate checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                if (data[checkbox.name] !== undefined) {
                    checkbox.checked = data[checkbox.name] === 'true';
                }
            });

            // Populate Color Picker
            if (data.accent_color) {
                const swatch = document.querySelector(`.color-swatch[data-color="${data.accent_color}"]`);
                if (swatch) {
                    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
                    swatch.classList.add('active');
                    document.getElementById('input-accent-color').value = data.accent_color;
                }
            }

            // Populate School Logo Preview
            if (data.school_logo) {
                const preview = document.getElementById('logo-preview');
                if (preview) {
                    preview.src = data.school_logo;
                    preview.style.display = 'block';
                }
            }

            // Populate Weekends
            const daysContainer = document.getElementById('days-container');
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            let schoolDays = {};
            try {
                if(data.school_days) schoolDays = JSON.parse(data.school_days);
            } catch(e){}

            daysContainer.innerHTML = '';
            days.forEach(day => {
                const isChecked = schoolDays[day] !== false; // Default to true if not set
                daysContainer.innerHTML += `
                    <div class="setting-row">
                        <div class="setting-info">
                            <h4>${day}</h4>
                            <p>Record attendance on this day.</p>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" name="day_${day}" ${isChecked ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                `;
            });

            // Trigger preview for ID Card Designer if function exists
            if (typeof previewIDCard === 'function') {
                setTimeout(previewIDCard, 100);
            }

            // Populate Classes & Expiries
            try {
                if(data.class_expiries) globalClassExpiries = JSON.parse(data.class_expiries);
            } catch(e) {}
            renderClassesTable();

        }
    } catch(e) {
        console.error(e);
        showNotification("Failed to load settings.", "error");
    }
}

async function loadHolidays() {
    try {
        const res = await fetchData('api/holidays.php?action=list');
        const tbody = document.querySelector('#holidays-table tbody');
        tbody.innerHTML = '';
        if (res && res.status === 'success') {
            res.data.forEach(h => {
                tbody.innerHTML += `
                    <tr>
                        <td>
                            <strong>${h.name}</strong>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${h.description || ''}</div>
                        </td>
                        <td>${h.start_date} to ${h.end_date}</td>
                        <td>
                            <button type="button" class="btn btn-danger" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="deleteHoliday(${h.id})">Delete</button>
                        </td>
                    </tr>
                `;
            });
            if(res.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No holidays configured.</td></tr>';
            }
        }
    } catch(e) {
        console.error(e);
    }
}

async function deleteHoliday(id) {
    if(confirm("Delete this holiday?")) {
        const fd = new FormData();
        fd.append('id', id);
        const res = await fetch(API_BASE_URL + 'api/holidays.php?action=delete', {
            method: 'POST', body: fd, headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        const json = await res.json();
        if(json.status === 'success') {
            showNotification("Holiday deleted", "success");
            loadHolidays();
        } else {
            showNotification(json.message, "error");
        }
    }
}

function renderClassesTable() {
    const tbody = document.querySelector('#classes-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const classes = Object.keys(globalClassExpiries).sort();
    if (classes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No classes configured.</td></tr>';
        return;
    }

    classes.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${c}</strong></td>
                <td>${globalClassExpiries[c]}</td>
                <td>
                    <button type="button" class="btn btn-danger" style="padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="deleteClass('${c.replace(/'/g, "\\'")}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

async function deleteClass(className) {
    if(confirm(`Delete expiry date for ${className}?`)) {
        delete globalClassExpiries[className];
        const fd = new FormData();
        fd.append('class_expiries', JSON.stringify(globalClassExpiries));
        
        try {
            const res = await fetch(API_BASE_URL + 'api/settings.php?action=update', {
                method: 'POST', body: fd, headers: { 'ngrok-skip-browser-warning': '69420' }
            });
            const json = await res.json();
            if(json.status === 'success') {
                showNotification("Class deleted", "success");
                renderClassesTable();
            } else {
                showNotification(json.message, "error");
            }
        } catch(e) {
            showNotification("Error", "error");
        }
    }
}

function setupFormListeners() {
    // School logo preview listener
    const logoInput = document.getElementById('school_logo');
    if(logoInput) {
        logoInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('logo-preview');
                    if (preview) {
                        preview.src = e.target.result;
                        preview.style.display = 'block';
                    }
                }
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    // Generic settings forms
    const forms = ['form-school', 'form-schedule', 'form-theme', 'form-dashboard', 'form-notifications', 'form-qrcode', 'form-idcard'];
    forms.forEach(formId => {
        const form = document.getElementById(formId);
        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveSettings(new FormData(form), form.querySelector('button[type="submit"]'));
            });
        }
    });

    // Weekends form (Custom logic because dynamic inputs)
    const formWeekends = document.getElementById('form-weekends');
    if(formWeekends) {
        formWeekends.addEventListener('submit', async (e) => {
            e.preventDefault();
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const schoolDays = {};
            days.forEach(d => {
                const input = formWeekends.querySelector(`input[name="day_${d}"]`);
                schoolDays[d] = input ? input.checked : false;
            });
            const fd = new FormData();
            fd.append('school_days', JSON.stringify(schoolDays));
            await saveSettings(fd, formWeekends.querySelector('button[type="submit"]'));
        });
    }

    // Add holiday form
    const formHoliday = document.getElementById('form-add-holiday');
    if(formHoliday) {
        formHoliday.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formHoliday.querySelector('button[type="submit"]');
            const ogText = btn.innerHTML;
            btn.innerHTML = 'Saving...'; btn.disabled = true;
            
            try {
                const res = await fetch(API_BASE_URL + 'api/holidays.php?action=add', {
                    method: 'POST', body: new FormData(formHoliday), headers: { 'ngrok-skip-browser-warning': '69420' }
                });
                const json = await res.json();
                if(json.status === 'success') {
                    showNotification("Holiday added", "success");
                    formHoliday.reset();
                    loadHolidays();
                } else {
                    showNotification(json.message, "error");
                }
            } catch(e) {
                showNotification("Error", "error");
            } finally {
                btn.innerHTML = ogText; btn.disabled = false;
            }
        });
    }

    // Add class form
    const formClass = document.getElementById('form-add-class');
    if(formClass) {
        formClass.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formClass.querySelector('button[type="submit"]');
            const ogText = btn.innerHTML;
            btn.innerHTML = 'Saving...'; btn.disabled = true;

            const fd = new FormData(formClass);
            const cname = fd.get('class_name');
            const expiry = fd.get('expiry_date');

            if (cname && expiry) {
                globalClassExpiries[cname] = expiry;
                
                const saveFd = new FormData();
                saveFd.append('class_expiries', JSON.stringify(globalClassExpiries));
                
                try {
                    const res = await fetch(API_BASE_URL + 'api/settings.php?action=update', {
                        method: 'POST', body: saveFd, headers: { 'ngrok-skip-browser-warning': '69420' }
                    });
                    const json = await res.json();
                    if(json.status === 'success') {
                        showNotification("Class saved", "success");
                        formClass.reset();
                        renderClassesTable();
                    } else {
                        showNotification(json.message, "error");
                    }
                } catch(e) {
                    showNotification("Error", "error");
                }
            }
            
            btn.innerHTML = ogText; btn.disabled = false;
        });
    }
}

async function saveSettings(formData, btnElement) {
    const ogText = btnElement.innerHTML;
    btnElement.innerHTML = 'Saving...';
    btnElement.disabled = true;

    // Convert checkboxes to "true"/"false" explicitly
    for (let pair of formData.entries()) {
        const input = document.querySelector(`input[name="${pair[0]}"][type="checkbox"]`);
        if (input) {
            formData.set(pair[0], input.checked ? "true" : "false");
        }
    }
    
    // Check for unchecked checkboxes since FormData omits them
    document.querySelectorAll('.settings-section.active input[type="checkbox"]').forEach(cb => {
        if(!cb.checked && !cb.name.startsWith('day_')) { // ignore dynamic weekend checkboxes
            formData.set(cb.name, "false");
        }
    });

    try {
        const res = await fetch(API_BASE_URL + 'api/settings.php?action=update', {
            method: 'POST', body: formData, headers: { 'ngrok-skip-browser-warning': '69420' }
        });
        const json = await res.json();
        if(json.status === 'success') {
            showNotification("Settings saved successfully!", "success");
            // Reload global settings cache and theme without page reload
            loadSystemSettings();
        } else {
            showNotification(json.message, "error");
        }
    } catch(e) {
        showNotification("Failed to save settings.", "error");
    } finally {
        btnElement.innerHTML = ogText;
        btnElement.disabled = false;
    }
}
