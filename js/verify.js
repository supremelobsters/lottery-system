class KeyVerifier {
    constructor() {
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.keyInput = document.getElementById('keyInput');
        this.verifyBtn = document.getElementById('verifyBtn');
    }

    initEventListeners() {
        this.verifyBtn.addEventListener('click', () => this.verifyKey());
        this.keyInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    verifyKey() {
        const code = this.keyInput.value.trim();
        if (code.length !== 16) {
            alert('请输入16位卡密');
            return;
        }

        const keys = JSON.parse(localStorage.getItem('lottery_keys') || '[]');
        const key = keys.find(k => k.code === code);

        if (!key) {
            alert('无效的卡密');
            return;
        }

        if (key.status === 'expired') {
            alert('此卡密已过期');
            return;
        }

        if (key.status === 'active') {
            const remaining = this.getTimeRemaining(key.activatedAt);
            alert(`此卡密已激活，剩余有效期：${remaining}`);
            return;
        }

        // 激活卡密
        key.status = 'active';
        key.activatedAt = Date.now();
        localStorage.setItem('lottery_keys', JSON.stringify(keys));
        
        alert('卡密验证成功！有效期24小时');
        window.location.href = 'index.html'; // 跳转到抽奖页面
    }

    getTimeRemaining(activatedAt) {
        const now = Date.now();
        const remaining = 24 * 60 * 60 * 1000 - (now - activatedAt);
        if (remaining <= 0) return '已过期';

        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}小时${minutes}分钟`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.keyVerifier = new KeyVerifier();
}); 