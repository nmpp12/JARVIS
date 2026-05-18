import { FinanceApp } from './app.js';
import '../styles/finance.css';

const root = document.getElementById('finance-app');
const app = new FinanceApp(root);
app.init();

// Register service worker for PWA installation support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
