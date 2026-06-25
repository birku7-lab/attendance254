// Change this to your ngrok URL before pushing to GitHub!
// Example: const PROD_API_URL = 'https://1234-abcd.ngrok-free.app/school%20attendance/';
const PROD_API_URL = 'https://ver-lap-doc-beijing.trycloudflare.com/school%20attendance/';

// Automatically determine base URL based on environment
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = '/school%20attendance/';
} else if (window.location.protocol === 'file:') {
    API_BASE_URL = 'http://localhost/school%20attendance/';
} else {
    API_BASE_URL = PROD_API_URL;
}

