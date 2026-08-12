# GitHub Pages bridge fix

Sửa callback từ Apps Script HTML Service về GitHub Pages bằng `window.top.postMessage(...)` thay cho `window.parent.postMessage(...)`, do HTML Service chạy trong iframe sandbox của Google.
