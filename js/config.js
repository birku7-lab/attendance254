// Change this to your ngrok URL before pushing to GitHub!
// Example: const PROD_API_URL = 'https://1234-abcd.ngrok-free.app/school attendance/';
const PROD_API_URL = 'https://boats-comment-screen-cube.trycloudflare.com/school attendance/';

// Automatically determine base URL based on environment
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = '/school attendance/';
} else if (window.location.protocol === 'file:') {
    API_BASE_URL = 'http://localhost/school attendance/';
} else {
    API_BASE_URL = PROD_API_URL;
}
