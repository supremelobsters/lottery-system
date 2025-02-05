class KeyManager {
    constructor() {
        this.keys = this.loadKeys();
        this.initElements();
        this.initEventListeners();
        this.renderKeyList();
        this.checkExpiredKeys();
    }

    initElements() {
        this.generateBtn = document.getElementById('generateBtn');
        this.keyCountInput = document.getElementById('keyCount');
        this.keyList = document.getElementById('keyList');
        this.copyAllBtn = document.getElementById('copyAllBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.exportExcelBtn = document.getElementById('exportExcelBtn');
        this.exportJsBtn = document.getElementById('exportJsBtn');
    }

    initEventListeners() {
        this.generateBtn.addEventListener('click', () => this.generateKeys());
        this.copyAllBtn.addEventListener('click', () => this.copyAllKeys());
        this.clearAllBtn.addEventListener('click', () => this.clearAllKeys());
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.filterKeys(e));
        });
        this.exportExcelBtn.addEventListener('click', () => this.exportToExcel());
        this.exportJsBtn.addEventListener('click', () => this.exportToJs());
    }

    loadKeys() {
        return JSON.parse(localStorage.getItem('lottery_keys') || '[]');
    }

    saveKeys() {
        localStorage.setItem('lottery_keys', JSON.stringify(this.keys));
    }

    generateKey() {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let key = '';
        for (let i = 0; i < 16; i++) {
            key += chars[Math.floor(Math.random() * chars.length)];
        }
        return key;
    }

    generateKeys() {
        const count = parseInt(this.keyCountInput.value);
        if (count < 1 || count > 1000) {
            alert('请输入1-1000之间的数量');
            return;
        }

        if (count > 100) {
            if (!confirm(`确定要生成${count}个卡密吗？数量较大可能需要等待几秒钟。`)) {
                return;
            }
        }

        for (let i = 0; i < count; i++) {
            this.keys.push({
                code: this.generateKey(),
                status: 'inactive',
                createdAt: Date.now(),
                activatedAt: null
            });
        }

        this.saveKeys();
        this.renderKeyList();
        alert(`成功生成${count}个卡密`);
    }

    copyAllKeys() {
        const keyText = this.keys.map(key => key.code).join('\n');
        navigator.clipboard.writeText(keyText).then(() => {
            alert('已复制所有卡密到剪贴板');
        });
    }

    clearAllKeys() {
        if (confirm('确定要清空所有卡密吗？此操作不可恢复！')) {
            this.keys = [];
            this.saveKeys();
            this.renderKeyList();
        }
    }

    copyKey(code) {
        navigator.clipboard.writeText(code).then(() => {
            alert('已复制卡密到剪贴板');
        });
    }

    checkExpiredKeys() {
        const now = Date.now();
        let hasChanges = false;

        this.keys.forEach(key => {
            if (key.status === 'active' && now - key.activatedAt > 24 * 60 * 60 * 1000) {
                key.status = 'expired';
                hasChanges = true;
            }
        });

        if (hasChanges) {
            this.saveKeys();
            this.renderKeyList();
        }

        setTimeout(() => this.checkExpiredKeys(), 60000); // 每分钟检查一次
    }

    getTimeRemaining(activatedAt) {
        const now = Date.now();
        const remaining = 24 * 60 * 60 * 1000 - (now - activatedAt);
        if (remaining <= 0) return '已过期';

        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}小时${minutes}分钟`;
    }

    filterKeys(e) {
        const status = e.target.dataset.status;
        this.filterBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.renderKeyList(status);
    }

    renderKeyList(filter = 'all') {
        this.keyList.innerHTML = '';
        let filteredKeys = this.keys;
        
        if (filter !== 'all') {
            filteredKeys = this.keys.filter(key => key.status === filter);
        }

        filteredKeys.forEach(key => {
            const keyItem = document.createElement('div');
            keyItem.className = 'key-item';
            
            const keyInfo = document.createElement('div');
            keyInfo.className = 'key-info';
            
            const keyCode = document.createElement('span');
            keyCode.className = 'key-code';
            keyCode.textContent = key.code;
            
            const keyStatus = document.createElement('span');
            keyStatus.className = `key-status status-${key.status}`;
            keyStatus.textContent = {
                'inactive': '未激活',
                'active': '已激活',
                'expired': '已过期'
            }[key.status];

            if (key.status === 'active') {
                keyStatus.textContent += ` (${this.getTimeRemaining(key.activatedAt)})`;
            }

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.textContent = '复制';
            copyBtn.onclick = () => this.copyKey(key.code);

            keyInfo.appendChild(keyCode);
            keyInfo.appendChild(keyStatus);
            keyItem.appendChild(keyInfo);
            keyItem.appendChild(copyBtn);
            this.keyList.appendChild(keyItem);
        });
    }

    exportToExcel() {
        const workbook = XLSX.utils.book_new();
        const data = this.keys.map(key => ({
            卡密: key.code,
            状态: {
                'inactive': '未激活',
                'active': '已激活',
                'expired': '已过期'
            }[key.status],
            创建时间: new Date(key.createdAt).toLocaleString(),
            激活时间: key.activatedAt ? new Date(key.activatedAt).toLocaleString() : '-'
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, "卡密列表");
        
        XLSX.writeFile(workbook, "lottery_keys.xlsx");
    }

    exportToJs() {
        // 只导出未激活的卡密
        const inactiveKeys = this.keys
            .filter(key => key.status === 'inactive')
            .map(key => ({
                code: key.code,
                status: key.status,
                createdAt: key.createdAt
            }));

        const jsContent = `// 卡密数据，由管理平台导出
const LOTTERY_KEYS = ${JSON.stringify(inactiveKeys, null, 2)};`;

        const blob = new Blob([jsContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'keys.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.keyManager = new KeyManager();
}); 