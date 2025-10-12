import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, signOut, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getDatabase, set, ref, update, onValue, get, push, runTransaction, remove, query, orderByChild, equalTo, limitToLast } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";
const firebaseConfig = {
  apiKey: "AIzaSyDgFaTrHW7Grp_Q22p6KNcHZxaEujHsLsE",
  authDomain: "exchange-project-d4028.firebaseapp.com",
  databaseURL: "https://exchange-project-d4028-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "exchange-project-d4028",
  storageBucket: "exchange-project-d4028.firebasestorage.app",
  messagingSenderId: "313976742479",
  appId: "1:313976742479:web:45951b360d875c4768c03a",
  measurementId: "G-PQMFYZS958"
};

// গ্লোবাল ভ্যারিয়েবল থেকে লোড করার পরিবর্তে এখন হার্ডকোড করা মান ব্যবহার করা হবে
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app); 

const showNotification = (message, type = 'info') => {
    const container = document.getElementById('notification-container') || document.body;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    if (!document.querySelector('style') || !document.querySelector('style').textContent.includes('.notification')) {
        const style = document.createElement('style');
        style.textContent = `
            .notification {
                position: fixed; bottom: 1rem; right: 1rem; padding: 0.75rem 1rem; border-radius: 0.75rem; 
                color: white; font-weight: 600; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); z-index: 9999;
                transition: all 0.3s ease-in-out; transform: translateX(120%); opacity: 0; font-size: 0.875rem;
            }
            .notification.show { transform: translateX(0); opacity: 1; }
            .notification.success { background-color: #10b981; }
            .notification.error { background-color: #ef4444; }
            .notification.info { background-color: #3b82f6; }
        `;
        document.head.appendChild(style);
    }

    container.appendChild(notification);
    
    setTimeout(() => { notification.classList.add('show'); }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 4000);
};

const logout = async () => {
    try {
        await signOut(auth);
        showNotification("আপনি লগআউট করেছেন।", 'info');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } catch (error) {
        console.error("Logout Error:", error);
        showNotification("লগআউট ব্যর্থ হয়েছে।", 'error');
    }
};

const initAuth = async (callback = () => {}) => {
    if (auth.currentUser) {
        callback(auth.currentUser);
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            try {
                await setPersistence(auth, browserSessionPersistence);
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
                showNotification("লগইন প্রয়োজন।", 'error');
                if (initialAuthToken) { 
                    setTimeout(() => { window.location.href = 'login.html'; }, 1500); 
                }
            }
        } else {
            callback(user);
        }
    });
};

export { 
    auth, 
    rtdb, 
    appId,
    showNotification, 
    logout, 
    initAuth,
    set, 
    ref, 
    update, 
    onValue,
    get,
    push,
    runTransaction,
    remove,
    query,
    orderByChild,
    equalTo,
    limitToLast
};

