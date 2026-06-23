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

    // Load Students List
    const studentsTableBody = document.querySelector('#students-table tbody');
    if (studentsTableBody) {
        loadStudents();
        
        // Search functionality
        const searchInput = document.getElementById('search-student');
        if (searchInput) {
            searchInput.addEventListener('keyup', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = studentsTableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        }
    }
});

async function loadStudents() {
    const tbody = document.querySelector('#students-table tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading...</td></tr>';
    
    const res = await fetchData('api/students.php?action=list');
    
    if (res && res.status === 'success') {
        tbody.innerHTML = '';
        if (res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No students found.</td></tr>';
            return;
        }
        
        res.data.forEach(s => {
            const tr = document.createElement('tr');
            const photoSrc = s.photo ? s.photo : 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ccc%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2021v-2a4%204%200%200%200-4-4H8a4%204%200%200%200-4%204v2%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%227%22%20r%3D%224%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E';
            tr.innerHTML = `
                <td><img src="${photoSrc}" alt="${s.full_name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;background:#f0f0f0;"></td>
                <td><strong>${s.full_name}</strong></td>
                <td>${s.admission_number}</td>
                <td>${s.class}</td>
                <td>${s.gender}</td>
                <td>
                    <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="viewProfile(${s.id})">Profile & QR</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
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
        const photoSrc = s.photo ? s.photo : 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2280%22%20height%3D%2280%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ccc%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2021v-2a4%204%200%200%200-4-4H8a4%204%200%200%200-4%204v2%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%227%22%20r%3D%224%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E';
        
        let percentage = 0;
        if (s.stats.total_days > 0) {
            percentage = Math.round((s.stats.present_days / s.stats.total_days) * 100);
        }

        document.getElementById('profile-content').innerHTML = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <img src="${photoSrc}" alt="${s.full_name}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);margin-bottom:1rem;background:#f0f0f0;">
                <h2 style="margin:0;color:var(--dark);">${s.full_name}</h2>
                <p style="color:var(--gray);margin-top:0.2rem;">${s.admission_number}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: rgba(0,0,0,0.03); padding: 1rem; border-radius: 10px; text-align: center;">
                    <p style="color:var(--gray); font-size: 0.85rem; margin-bottom: 0.2rem;">Class</p>
                    <strong>${s.class}</strong>
                </div>
                <div style="background: rgba(0,0,0,0.03); padding: 1rem; border-radius: 10px; text-align: center;">
                    <p style="color:var(--gray); font-size: 0.85rem; margin-bottom: 0.2rem;">Gender</p>
                    <strong>${s.gender}</strong>
                </div>
            </div>

            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem; color: var(--gray);">Student QR Code</h4>
                <div id="qrcode-container" style="display:inline-block; padding: 10px; background: white; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);"></div>
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="printQR('${s.full_name}', '${s.admission_number}')" style="font-size: 0.9rem;">🖨️ Print ID Card</button>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.03); padding: 1rem; border-radius: 10px;">
                <h4 style="margin-bottom: 1rem; color: var(--dark); border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 0.5rem;">Attendance Stats</h4>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Present Days:</span> <strong style="color: var(--success);">${s.stats.present_days || 0}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Absent Days:</span> <strong style="color: var(--danger);">${s.stats.absent_days || 0}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Percentage:</span> <strong style="color: var(--primary);">${percentage}%</strong>
                </div>
            </div>
        `;

        // Generate QR Code
        new QRCode(document.getElementById("qrcode-container"), {
            text: s.qr_code,
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

function printQR(name, adm) {
    const qrContainer = document.getElementById('qrcode-container');
    const qrImg = qrContainer.querySelector('img').src;
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Print ID Card - ${name}</title>
                <style>
                    body { font-family: 'Inter', sans-serif; text-align: center; padding: 20px; }
                    .card { border: 2px solid #333; border-radius: 10px; padding: 20px; width: 250px; margin: 0 auto; }
                    .school-name { font-weight: bold; font-size: 18px; margin-bottom: 15px; color: #4f46e5; }
                    .student-name { font-weight: bold; font-size: 16px; margin: 10px 0 5px 0; }
                    .adm-no { color: #555; font-size: 14px; margin-bottom: 15px; }
                    img { max-width: 150px; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="school-name">School ID Card</div>
                    <img src="${qrImg}" alt="QR Code">
                    <div class="student-name">${name}</div>
                    <div class="adm-no">${adm}</div>
                </div>
                <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Print</button>
            </body>
        </html>
    `);
    printWindow.document.close();
}

async function downloadStudentsPDF() {
    const btn = document.getElementById('download-pdf-btn');
    btn.innerHTML = '<i class="ph ph-spinner"></i> Generating...';
    btn.disabled = true;

    const res = await fetchData('api/students.php?action=list');

    if (!res || res.status !== 'success' || res.data.length === 0) {
        showNotification('No students found to export.', 'error');
        btn.innerHTML = '<i class="ph ph-file-pdf"></i> Download PDF';
        btn.disabled = false;
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header background
    doc.setFillColor(79, 70, 229); // primary indigo
    doc.rect(0, 0, 297, 28, 'F');

    // School name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('EduGate School System', 14, 13);

    // Report title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Student Directory Report', 14, 21);

    // Date on right
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFontSize(9);
    doc.text(`Generated: ${dateStr}`, 297 - 14, 21, { align: 'right' });

    // Summary box
    doc.setTextColor(50, 50, 50);
    doc.setFillColor(245, 245, 255);
    doc.roundedRect(14, 32, 60, 14, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Students', 16, 38);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text(String(res.data.length), 16, 45);

    // Count by gender
    const males = res.data.filter(s => s.gender && s.gender.toLowerCase() === 'male').length;
    const females = res.data.filter(s => s.gender && s.gender.toLowerCase() === 'female').length;

    doc.setFillColor(245, 255, 250);
    doc.roundedRect(80, 32, 60, 14, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text('Male Students', 82, 38);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(String(males), 82, 45);

    doc.setFillColor(255, 245, 255);
    doc.roundedRect(146, 32, 60, 14, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text('Female Students', 148, 38);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(236, 72, 153);
    doc.text(String(females), 148, 45);

    // Table
    const tableData = res.data.map((s, i) => [
        i + 1,
        s.full_name || '-',
        s.admission_number || '-',
        s.class || '-',
        s.gender || '-',
        s.phone || '-',
        s.email || '-',
        s.date_of_birth || '-',
        s.created_at ? s.created_at.split(' ')[0] : '-'
    ]);

    doc.autoTable({
        startY: 52,
        head: [['#', 'Full Name', 'Adm No.', 'Class', 'Gender', 'Phone', 'Email', 'Date of Birth', 'Registered']],
        body: tableData,
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [40, 40, 40] },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 45 },
            2: { cellWidth: 25 },
            3: { cellWidth: 22 },
            4: { cellWidth: 20 },
            5: { cellWidth: 28 },
            6: { cellWidth: 48 },
            7: { cellWidth: 28 },
            8: { cellWidth: 28 }
        },
        margin: { left: 14, right: 14 }
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

    doc.save(`Students_Directory_${now.toISOString().slice(0, 10)}.pdf`);

    btn.innerHTML = '<i class="ph ph-file-pdf"></i> Download PDF';
    btn.disabled = false;
    showNotification(`PDF exported with ${res.data.length} students!`, 'success');
}
