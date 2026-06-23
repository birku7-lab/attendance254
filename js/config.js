// Change this to your ngrok URL before pushing to GitHub!
// Example: const PROD_API_URL = 'https://1234-abcd.ngrok-free.app/school attendance/';
const PROD_API_URL = 'https://honest-feelings-potato-moderate.trycloudflare.com/school attendance/';

// Automatically determine base URL based on environment
// In local development, we use relative paths. In production (Vercel), we use the Ngrok URL.
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/school attendance/' 
    : PROD_API_URL;
