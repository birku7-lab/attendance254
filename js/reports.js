document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const dateInput = document.getElementById('report-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    const reportType = document.getElementById('report-type');
    const classContainer = document.getElementById('class-filter-container');
    
    if (reportType) {
        reportType.addEventListener('change', (e) => {
            if (e.target.value === 'class') {
                classContainer.style.display = 'block';
                document.getElementById('report-class').required = true;
            } else {
                classContainer.style.display = 'none';
                document.getElementById('report-class').required = false;
                document.getElementById('report-class').value = '';
            }
        });
    }

    const reportForm = document.getElementById('report-form');
    if (reportForm) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(reportForm);
            const params = new URLSearchParams(formData).toString();
            loadReport(params, formData);
        });
    }
});

async function loadReport(params, formData) {
    const tbody = document.querySelector('#report-table tbody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Loading report data...</td></tr>';
    
    const type = formData.get('type');
    const date = formData.get('date');
    const cls = formData.get('class');
    
    // Update titles
    let titleText = 'Complete Attendance List';
    if (type === 'present') titleText = 'Present Students Only';
    if (type === 'absent') titleText = 'Absent Students Only';
    if (type === 'class') titleText = `Attendance for Class: ${cls}`;
    
    document.getElementById('report-title').textContent = `${titleText} - ${date}`;
    document.getElementById('print-subtitle').textContent = `Report Type: ${titleText} | Date: ${date} | Generated: ${new Date().toLocaleString()}`;

    const res = await fetchData(`api/reports.php?action=report_data&${params}`);
    
    if (res && res.status === 'success') {
        tbody.innerHTML = '';
        if (res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">No data found for this report.</td></tr>';
            return;
        }
        
        res.data.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.admission_number}</td>
                <td><strong>${r.full_name}</strong></td>
                <td>${r.class}</td>
                <td>${r.arrival_time}</td>
                <td style="font-weight:bold; color: ${r.status === 'Present' ? 'var(--success)' : 'var(--danger)'};">${r.status}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:red;">Error loading report</td></tr>`;
    }
}
