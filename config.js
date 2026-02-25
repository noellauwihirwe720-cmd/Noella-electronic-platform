// config.js - Your Firebase Configuration
// REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM FIREBASE CONSOLE

const firebaseConfig = {
    apiKey: "AIzaSyBp3sdfghjkl123456789",  // ← PUT YOUR REAL API KEY HERE
    authDomain: "noella-electronics.firebaseapp.com",  // ← PUT YOUR REAL DOMAIN
    projectId: "noella-electronis",  // ← PUT YOUR REAL PROJECT ID
    storageBucket: "noella-electronis.appspot.com",  // ← PUT YOUR REAL BUCKET
    messagingSenderId: "123456789012",  // ← PUT YOUR REAL SENDER ID
    appId: "1:123456789012:web:abc123def456"  // ← PUT YOUR REAL APP ID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// EmailJS Configuration - THESE ARE CORRECT!
const EMAILJS_CONFIG = {
    PUBLIC_KEY: "agAYd3IPoo9KYbNZF",     // Your EmailJS public key
    SERVICE_ID: "noellashop",             // Your Outlook service ID
    ADMIN_TEMPLATE: "template_wuzlm43",   // Admin template ID
    CUSTOMER_TEMPLATE: "template_0ga6z7o" // Customer template ID
};

// Email configuration for notifications
const ADMIN_EMAIL = "noella.electronics@outlook.com"; // Your email

// Initialize EmailJS
emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);