import { FinanceApp } from './app.js';
import { createMomStack } from '../shared/momStack.js';
import '../styles/finance.css';

const momStack = createMomStack();
const root = document.getElementById('finance-app');
const app = new FinanceApp(root, momStack);
app.init();

// Register service worker for PWA installation support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}
