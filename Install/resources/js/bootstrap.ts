import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Fix Radix dropdown positioning issue in tables
// The dropdown gets positioned at -200% when inside overflow containers
const fixDropdownPosition = () => {
    const wrapper = document.querySelector('[data-radix-popper-content-wrapper]') as HTMLElement | null;
    if (!wrapper) return false;
    if (!wrapper.style.transform.includes('-200%')) return false;

    const trigger = document.querySelector('button[aria-expanded="true"]');
    if (!trigger) return false;

    const content = wrapper.querySelector('[role="menu"]');
    if (!content) return false;

    const triggerRect = trigger.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = triggerRect.right - contentRect.width;
    let y = triggerRect.bottom + 4;

    if (x + contentRect.width > viewportWidth - 8) {
        x = viewportWidth - contentRect.width - 8;
    }
    if (x < 8) x = 8;

    if (y + contentRect.height > viewportHeight - 8) {
        y = triggerRect.top - contentRect.height - 4;
    }

    wrapper.style.setProperty('transform', `translate(${Math.round(x)}px, ${Math.round(y)}px)`, 'important');
    return true;
};

document.addEventListener('click', () => {
    let attempts = 0;
    const tryFix = () => {
        if (fixDropdownPosition()) return;
        if (++attempts < 20) requestAnimationFrame(tryFix);
    };
    requestAnimationFrame(tryFix);
}, true);
