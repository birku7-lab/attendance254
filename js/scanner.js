let html5QrCode;
let isProcessing = false;
let isPausedByUser = false;

function togglePauseResume() {
    const btn = document.getElementById('pause-resume-btn');
    if (!html5QrCode) return;

    if (isPausedByUser) {
        // Resume
        if(html5QrCode.getState() === 3 /* PAUSED */) {
            html5QrCode.resume();
        }
        isPausedByUser = false;
        btn.innerHTML = '<i class="ph ph-pause"></i> Pause Scanner';
        btn.className = 'btn btn-warning';
        document.getElementById('scan-status').textContent = 'Ready to Scan...';
        document.getElementById('scan-status').style.color = 'var(--primary)';
    } else {
        // Pause
        if(html5QrCode.getState() === 2 /* SCANNING */) {
            html5QrCode.pause(true);
        }
        isPausedByUser = true;
        btn.innerHTML = '<i class="ph ph-play"></i> Resume Scanner';
        btn.className = 'btn btn-success';
        document.getElementById('scan-status').textContent = 'Scanner Paused by User';
        document.getElementById('scan-status').style.color = 'var(--warning)';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Webcam Scanner to automatically ask for permissions and start
    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanError)
    .catch(err => {
        document.getElementById('reader').innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--danger);">
                <i class="ph ph-warning" style="font-size: 2rem;"></i><br>
                <strong>Camera Access Denied</strong><br>
                <span style="font-size: 0.9rem;">Please allow camera permissions in your browser settings and refresh the page.</span>
            </div>
        `;
    });

    // Initialize USB Scanner listener
    // Keep focus on the hidden input
    const usbInput = document.getElementById('usb-scanner-input');
    
    document.addEventListener('click', () => {
        // Only focus if it's not a touch device to prevent mobile keyboard from popping up
        if(usbInput && !('ontouchstart' in window)) usbInput.focus();
    });

    if (usbInput) {
        usbInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const code = this.value.trim();
                this.value = ''; // clear for next scan
                if (code) {
                    processScan(code);
                }
            }
        });
        usbInput.focus();
    }
});

function onScanSuccess(decodedText, decodedResult) {
    if(isProcessing) return;
    
    if(html5QrCode && html5QrCode.getState() === 2 /* SCANNING */) {
        html5QrCode.pause(true);
    }
    processScan(decodedText);
}

function onScanError(errorMessage) {
    // Ignore routine errors
}

async function processScan(qrCode) {
    if (isProcessing) return;
    isProcessing = true;
    
    document.getElementById('scan-status').textContent = 'Processing...';
    document.getElementById('scan-status').style.color = 'var(--warning)';
    
    const formData = new FormData();
    formData.append('qr_code', qrCode);

    const res = await fetchData('api/attendance.php?action=scan', {
        method: 'POST',
        body: formData
    });

    document.getElementById('idle-card').style.display = 'none';
    const resultCard = document.getElementById('result-card');
    
    // Reset classes
    resultCard.className = 'scan-result-card';

    if (res && (res.status === 'success' || res.status === 'duplicate')) {
        const s = res.data;
        const photoSrc = s.photo ? (API_BASE_URL + s.photo) : 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ccc%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M20%2021v-2a4%204%200%200%200-4-4H8a4%204%200%200%200-4%204v2%22%3E%3C%2Fpath%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%227%22%20r%3D%224%22%3E%3C%2Fcircle%3E%3C%2Fsvg%3E';
        
        document.getElementById('result-photo').src = photoSrc;
        document.getElementById('result-name').textContent = s.full_name;
        document.getElementById('result-adm').textContent = s.admission_number;
        document.getElementById('result-class').textContent = s.class;
        document.getElementById('result-gender').textContent = s.gender;

        if (res.status === 'success') {
            resultCard.classList.add('success');
            document.getElementById('result-icon').textContent = '✅';
            document.getElementById('result-message').textContent = 'Attendance Recorded Successfully';
            document.getElementById('result-message').style.color = 'var(--success)';
            document.getElementById('result-time').textContent = s.arrival_time;
            
            playAudio('beep-success');
        } else {
            resultCard.classList.add('duplicate');
            document.getElementById('result-icon').textContent = '⚠️';
            document.getElementById('result-message').textContent = 'Already Checked In Today';
            document.getElementById('result-message').style.color = 'var(--warning)';
            document.getElementById('result-time').textContent = res.first_scan_time + ' (First Scan)';
            
            playAudio('beep-warning');
        }
    } else {
        // Error
        resultCard.classList.add('error');
        document.getElementById('result-icon').textContent = '❌';
        document.getElementById('result-message').textContent = res?.message || 'Invalid QR Code';
        document.getElementById('result-message').style.color = 'var(--danger)';
        
        document.getElementById('result-photo').src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23ccc%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%2210%22%3E%3C%2Fcircle%3E%3Cline%20x1%3D%2215%22%20y1%3D%229%22%20x2%3D%229%22%20y2%3D%2215%22%3E%3C%2Fline%3E%3Cline%20x1%3D%229%22%20y1%3D%229%22%20x2%3D%2215%22%20y2%3D%2215%22%3E%3C%2Fline%3E%3C%2Fsvg%3E';
        document.getElementById('result-name').textContent = 'Unknown Student';
        document.getElementById('result-adm').textContent = '-';
        document.getElementById('result-class').textContent = '-';
        document.getElementById('result-gender').textContent = '-';
        document.getElementById('result-time').textContent = '-';
        
        playAudio('beep-error');
    }

    setTimeout(() => {
        isProcessing = false;
        document.getElementById('scan-status').textContent = 'Ready to Scan...';
        document.getElementById('scan-status').style.color = 'var(--primary)';
        
        // Re-enable webcam if used
        // Re-enable webcam if used and not paused by user
        if(html5QrCode && html5QrCode.getState() === 3 /* PAUSED */ && !isPausedByUser) {
            html5QrCode.resume();
        }
        
        const usbInput = document.getElementById('usb-scanner-input');
        if(usbInput) usbInput.focus();
    }, 2500); // Wait 2.5 seconds before allowing next scan
}

function playAudio(type) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'beep-success') {
        osc.frequency.value = 800;
        osc.type = "sine";
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'beep-warning') {
        osc.frequency.value = 400;
        osc.type = "square";
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } else {
        osc.frequency.value = 200;
        osc.type = "sawtooth";
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }
}
