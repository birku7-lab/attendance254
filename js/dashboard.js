document.addEventListener('DOMContentLoaded', () => {
    // Set current date & time
    const dateElement = document.getElementById('current-date-widget');
    const timeElement = document.getElementById('current-time-widget');
    
    function updateDateTime() {
        const now = new Date();
        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
    }
    
    updateDateTime();
    setInterval(updateDateTime, 60000);

    loadDashboardStats();
    
    // Refresh stats every 30 seconds
    setInterval(loadDashboardStats, 30000);
});

let lineChartInstance = null;
let donutChartInstance = null;

async function loadDashboardStats() {
    const res = await fetchData('api/dashboard.php');
    if (res && res.status === 'success') {
        const data = res.data;
        
        // Update top cards
        document.getElementById('stat-total').textContent = data.total_students;
        document.getElementById('stat-present').textContent = data.present_today;
        
        let presentPerc = data.total_students > 0 ? ((data.present_today / data.total_students) * 100).toFixed(2) : 0;
        document.getElementById('stat-present-subtitle').textContent = presentPerc + '% of total students';
        
        document.getElementById('stat-absent').textContent = data.absent_today;
        let absentPerc = data.total_students > 0 ? ((data.absent_today / data.total_students) * 100).toFixed(2) : 0;
        document.getElementById('stat-absent-subtitle').textContent = absentPerc + '% of total students';
        
        document.getElementById('stat-percentage').textContent = data.attendance_percentage + '%';

        // Update Live Scans
        const scansContainer = document.getElementById('live-scans-container');
        scansContainer.innerHTML = '';

        if (data.recent_scans && data.recent_scans.length > 0) {
            // Update summary
            document.getElementById('summary-total-scans').textContent = data.present_today;
            document.getElementById('summary-last-scan').textContent = data.recent_scans[0].arrival_time;

            // Render up to 5 scans
            data.recent_scans.slice(0, 5).forEach(scan => {
                const photoSrc = scan.photo ? (API_BASE_URL + scan.photo) : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(scan.full_name) + '&background=random';
                
                // Format time
                const [h, m] = scan.arrival_time.split(':');
                let hour = parseInt(h);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                hour = hour % 12;
                hour = hour ? hour : 12; 
                const timeStr = `${hour.toString().padStart(2, '0')}:${m} ${ampm}`;

                const div = document.createElement('div');
                div.className = 'scan-item';
                div.innerHTML = `
                    <div class="scan-user">
                        <img src="${photoSrc}" alt="${scan.full_name}">
                        <div class="scan-user-info">
                            <h4>${scan.full_name}</h4>
                            <p>${scan.admission_number || 'ID-XXX'}</p>
                        </div>
                    </div>
                    <div class="scan-class">${scan.class}</div>
                    <div class="scan-time">
                        ${timeStr}
                        <i class="ph-fill ph-check-circle"></i>
                    </div>
                `;
                scansContainer.appendChild(div);
            });
        } else {
            scansContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No scans yet today.</div>';
            document.getElementById('summary-total-scans').textContent = '0';
            document.getElementById('summary-last-scan').textContent = '-';
        }

        // Initialize Charts with mocked dynamic data (since we need historical data not currently in dashboard API)
        initLineChart(data.attendance_percentage);
        initDonutChart(data.total_students);
    }
}

function initLineChart(currentPercentage) {
    const ctx = document.getElementById('attendanceLineChart');
    if (!ctx) return;

    if (lineChartInstance) {
        lineChartInstance.destroy();
    }

    // Creating a gradient for the line chart fill
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

    // Mock weekly data ending with today's percentage
    const mockData = [60, 75, 82, 65, 68, 79, parseFloat(currentPercentage) || 0];

    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            datasets: [{
                label: 'Attendance %',
                data: mockData,
                borderColor: '#4f46e5',
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#4f46e5',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Smooth curve
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) { return context.parsed.y + '%'; }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: { color: '#94a3b8', font: { size: 11 }, stepSize: 25 }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#94a3b8', font: { size: 12 } }
                }
            }
        }
    });
}

function initDonutChart(totalStudents) {
    const ctx = document.getElementById('classDonutChart');
    if (!ctx) return;

    if (donutChartInstance) {
        donutChartInstance.destroy();
    }

    document.getElementById('donut-total').textContent = totalStudents;

    // Mock class distribution
    const labels = ['Grade 8 Blue', 'Grade 7A', 'Grade 7B', 'Grade 6A', 'Others'];
    // Adjust mock data to sum up approximately to totalStudents
    const p1 = Math.round(totalStudents * 0.249);
    const p2 = Math.round(totalStudents * 0.235);
    const p3 = Math.round(totalStudents * 0.208);
    const p4 = Math.round(totalStudents * 0.163);
    const p5 = totalStudents - (p1 + p2 + p3 + p4);
    
    const data = [p1, p2, p3, p4, p5];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#94a3b8'];

    donutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) { return ` ${context.label}: ${context.raw} students`; }
                    }
                }
            }
        }
    });

    // Build custom legend
    const legendContainer = document.getElementById('donut-legend');
    legendContainer.innerHTML = '';
    
    labels.forEach((label, i) => {
        const val = data[i];
        const perc = totalStudents > 0 ? ((val / totalStudents) * 100).toFixed(1) : 0;
        
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'space-between';
        
        div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${colors[i]};"></span>
                <span style="color: var(--text-main); font-weight: 500;">${label}</span>
            </div>
            <div style="color: var(--text-muted);">
                <span>${val}</span> <span style="font-size: 0.7rem; margin-left: 5px;">(${perc}%)</span>
            </div>
        `;
        legendContainer.appendChild(div);
    });
}
