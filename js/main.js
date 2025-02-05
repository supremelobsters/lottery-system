class LotterySystem {
    constructor() {
        this.prizes = [];
        this.people = [];
        this.originalPeople = []; // 保存原始人员数据
        this.winners = new Map();
        this.currentPrize = null;
        this.isRunning = false;
        this.allowRepeat = false;
        this.currentWinners = [];
        this.excelData = null; // 保存Excel文件的原始数据
        
        this.initVerification();
        this.initElements();
        this.disableAllButtons();
        this.initEventListeners();
        this.createStarField();
        this.initEditableTitle();
        this.peopleFileInput.remove(); // 移除第二个文件输入框，因为我们只需要一个
    }

    initVerification() {
        this.verifySection = document.getElementById('verifySection');
        this.keyInput = document.getElementById('keyInput');
        this.verifyBtn = document.getElementById('verifyBtn');
        this.keyStatus = document.getElementById('keyStatus');
        this.lotteryContent = document.getElementById('lotteryContent');

        // 检查是否已有有效卡密
        if (this.checkKeyVerification()) {
            this.showLotterySystem();
        } else {
            this.initVerificationEvents();
        }
    }

    initVerificationEvents() {
        this.verifyBtn.addEventListener('click', () => this.verifyKey());
        this.keyInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    verifyKey() {
        const code = this.keyInput.value.trim();
        if (code.length !== 16) {
            this.keyStatus.textContent = '请输入16位卡密';
            return;
        }

        // 使用静态卡密文件中的数据
        const keys = LOTTERY_KEYS;
        const key = keys.find(k => k.code === code);

        if (!key) {
            this.keyStatus.textContent = '无效的卡密';
            return;
        }

        // 检查卡密是否已在本地存储中被激活
        const activatedKeys = JSON.parse(localStorage.getItem('activated_keys') || '[]');
        const activatedKey = activatedKeys.find(k => k.code === code);
        
        if (activatedKey) {
            // 检查是否过期
            if (Date.now() - activatedKey.activatedAt > 24 * 60 * 60 * 1000) {
                this.keyStatus.textContent = '此卡密已过期';
                return;
            }
            const remaining = this.getTimeRemaining(activatedKey.activatedAt);
            this.keyStatus.textContent = `此卡密已激活，剩余有效期：${remaining}`;
            this.showLotterySystem();
            return;
        }

        // 激活卡密
        const newActivatedKey = {
            code: key.code,
            status: 'active',
            activatedAt: Date.now()
        };
        activatedKeys.push(newActivatedKey);
        localStorage.setItem('activated_keys', JSON.stringify(activatedKeys));
        
        this.keyStatus.textContent = '卡密验证成功！有效期24小时';
        this.showLotterySystem();
    }

    showLotterySystem() {
        this.verifySection.style.display = 'none';
        this.lotteryContent.style.display = 'block';
        setTimeout(() => {
            this.lotteryContent.classList.add('show');
        }, 100);
    }

    getTimeRemaining(activatedAt) {
        const now = Date.now();
        const remaining = 24 * 60 * 60 * 1000 - (now - activatedAt);
        if (remaining <= 0) return '已过期';

        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}小时${minutes}分钟`;
    }

    initElements() {
        this.prizeFileInput = document.getElementById('prizeFile');
        this.allowRepeatCheckbox = document.getElementById('allowRepeat');
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.currentPrizeElement = document.getElementById('currentPrize');
        this.currentGiftElement = document.getElementById('currentGift');
        this.prizeCountElement = document.getElementById('prizeCount');
        this.winnerElement = document.getElementById('winner');
        this.winnersListElement = document.getElementById('winnersList');
        this.prizeButtons = document.getElementById('prizeButtons');
    }

    initEventListeners() {
        this.prizeFileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || '未选择文件';
            document.getElementById('fileName').textContent = fileName;
            this.handleExcelFile(e);
        });
        this.allowRepeatCheckbox.addEventListener('change', (e) => {
            this.allowRepeat = e.target.checked;
        });
        this.startBtn.addEventListener('click', () => this.toggleLottery());
        this.resetBtn.addEventListener('click', () => this.resetLottery());
    }

    disableAllButtons() {
        if (this.startBtn && this.resetBtn && this.prizeButtons) {
            this.startBtn.disabled = true;
            this.resetBtn.disabled = true;
            this.prizeButtons.innerHTML = '';
        }
    }

    async handleExcelFile(event) {
        const file = event.target.files[0];
        const data = await this.readExcelFile(file);
        this.excelData = data;
        
        this.prizes = [];
        this.people = [];
        
        data.forEach(row => {
            if (row.Award && row.Amount && row.Gift) {
                this.prizes.push({
                    name: row.Award,
                    gift: row.Gift,
                    count: parseInt(row.Amount),
                    remaining: parseInt(row.Amount)
                });
            }
            if (row.Name) {
                this.people.push({
                    name: row.Name
                });
            }
        });

        if (this.prizes.length === 0 || this.people.length === 0) {
            alert('Excel文件格式不正确或数据为空！请确保文件包含有效的奖项和参与者数据。');
            this.disableAllButtons();
            return;
        }

        this.originalPeople = [...this.people];

        this.resetBtn.disabled = false;

        this.createPrizeButtons();
        if (this.prizes.length > 0) {
            this.selectPrize(this.prizes[0]);
        }

        alert(`成功导入${this.prizes.length}个奖项（含奖品），${this.people.length}名参与者`);
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                resolve(jsonData);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    createStarField() {
        const starField = document.getElementById('starField');
        for (let i = 0; i < 200; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.animationDuration = `${Math.random() * 3 + 1}s`;
            starField.appendChild(star);
        }
    }

    createPrizeButtons() {
        this.prizeButtons.innerHTML = '';
        this.prizes.forEach(prize => {
            const button = document.createElement('button');
            button.className = 'prize-button';
            if (prize.remaining <= 0) {
                button.classList.add('completed');
                button.disabled = true;
            }
            button.textContent = `${prize.name} - ${prize.gift} (${prize.remaining}/${prize.count})`;
            button.addEventListener('click', () => this.selectPrize(prize));
            if (this.isRunning) {
                button.disabled = true;
            }
            this.prizeButtons.appendChild(button);
        });
        this.updateStartButtonState();
    }

    selectPrize(prize) {
        if (prize.remaining <= 0) {
            return;
        }
        this.currentPrize = prize;
        this.updatePrizeInfo();
        
        const buttons = this.prizeButtons.getElementsByClassName('prize-button');
        Array.from(buttons).forEach(button => {
            button.classList.remove('active');
            if (button.textContent.includes(prize.name)) {
                button.classList.add('active');
            }
        });
        this.updateStartButtonState();
    }

    updatePrizeInfo() {
        if (this.currentPrize) {
            this.currentPrizeElement.textContent = this.currentPrize.name;
            this.currentGiftElement.textContent = this.currentPrize.gift;
            this.prizeCountElement.textContent = this.currentPrize.remaining;
        }
    }

    toggleLottery() {
        if (!this.isRunning) {
            this.startLottery();
        } else {
            this.stopLottery();
        }
        this.isRunning = !this.isRunning;
        this.startBtn.textContent = this.isRunning ? '停止抽奖' : '开始抽奖';
        this.resetBtn.disabled = this.isRunning;
        const buttons = this.prizeButtons.getElementsByClassName('prize-button');
        Array.from(buttons).forEach(button => {
            button.disabled = this.isRunning;
        });
    }

    startLottery() {
        if (!this.people.length || !this.currentPrize) {
            alert('请先上传抽奖名单和奖项！');
            return;
        }

        if (this.currentPrize.remaining <= 0) {
            alert('当前奖项已抽完！');
            return;
        }

        this.currentWinners = [];
        this.lotteryAnimation = setInterval(() => {
            const names = [];
            for (let i = 0; i < this.currentPrize.remaining; i++) {
                const randomPerson = this.people[Math.floor(Math.random() * this.people.length)];
                names.push(randomPerson.name);
            }
            this.winnerElement.textContent = names.join('、');
        }, 50);
    }

    stopLottery() {
        clearInterval(this.lotteryAnimation);
        
        for (let i = 0; i < this.currentPrize.remaining; i++) {
            const winner = this.selectWinner();
            if (winner) {
                this.currentWinners.push(winner);
                if (!this.allowRepeat) {
                    this.people = this.people.filter(p => p.name !== winner.name);
                }
            }
        }

        if (this.currentWinners.length > 0) {
            this.winnerElement.textContent = this.currentWinners.map(w => w.name).join('、');
            this.addToWinnersList(this.currentWinners);
            
            this.currentPrize.remaining = 0;
            this.updatePrizeInfo();
            const buttons = this.prizeButtons.getElementsByClassName('prize-button');
            Array.from(buttons).forEach(button => {
                if (button.textContent.includes(this.currentPrize.name)) {
                    button.disabled = true;
                    button.classList.add('completed');
                }
            });
            const nextPrize = this.prizes.find(p => p.remaining > 0);
            if (nextPrize) {
                this.selectPrize(nextPrize);
            }
            this.updateStartButtonState();
        }
    }

    selectWinner() {
        if (this.people.length === 0) return null;
        const index = Math.floor(Math.random() * this.people.length);
        return this.people[index];
    }

    addToWinnersList(winners) {
        const winnerItem = document.createElement('div');
        winnerItem.className = 'winner-item';
        winnerItem.textContent = `${this.currentPrize.name}(${this.currentPrize.gift}): ${winners.map(w => w.name).join('、')}`;
        this.winnersListElement.appendChild(winnerItem);
        
        if (!this.winners.has(this.currentPrize.name)) {
            this.winners.set(this.currentPrize.name, []);
        }
        this.winners.get(this.currentPrize.name).push(...winners);
    }

    resetLottery() {
        if (!confirm('确定要重置抽奖结果吗？这将清空所有中奖记录。')) {
            return;
        }
        
        if (!this.excelData) {
            alert('没有找到已上传的Excel数据，请先上传文件！');
            this.disableAllButtons();
            return;
        }

        this.prizes.forEach(prize => {
            prize.remaining = prize.count;
        });
        
        this.people = [...this.originalPeople];
        
        this.winners.clear();
        this.winnersListElement.innerHTML = '';
        this.winnerElement.textContent = '';
        
        this.createPrizeButtons();
        if (this.currentPrize) {
            this.selectPrize(this.currentPrize);
        }
        
        this.startBtn.disabled = false;
        this.resetBtn.disabled = false;
        
        alert('抽奖已重置！');
    }

    updateStartButtonState() {
        if (!this.excelData || (this.currentPrize && this.currentPrize.remaining <= 0)) {
            this.startBtn.disabled = true;
        } else {
            this.startBtn.disabled = false;
        }
    }

    checkKeyVerification() {
        const activatedKeys = JSON.parse(localStorage.getItem('activated_keys') || '[]');
        const now = Date.now();
        return activatedKeys.some(key => 
            key.status === 'active' && 
            now - key.activatedAt < 24 * 60 * 60 * 1000
        );
    }

    initEditableTitle() {
        const mainTitle = document.getElementById('mainTitle');
        if (!mainTitle) return;

        const defaultTitle = '公司年会抽奖';
        
        // 从localStorage加载保存的标题，如果没有则使用默认标题
        const savedTitle = localStorage.getItem('lotteryTitle');
        mainTitle.textContent = savedTitle || defaultTitle;

        // 监听标题变化并保存
        mainTitle.addEventListener('blur', () => {
            const newTitle = mainTitle.textContent.trim();
            if (!newTitle) {
                // 如果标题为空，恢复为默认标题
                mainTitle.textContent = defaultTitle;
                localStorage.removeItem('lotteryTitle');
            } else {
                localStorage.setItem('lotteryTitle', newTitle);
            }
        });

        // 按下回车时失去焦点
        mainTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                mainTitle.blur();
            }
        });

        // 双击标题时，如果是默认标题则清空内容
        mainTitle.addEventListener('dblclick', () => {
            if (mainTitle.textContent === defaultTitle) {
                mainTitle.textContent = '';
            }
        });
    }
}

// 初始化抽奖系统
document.addEventListener('DOMContentLoaded', () => {
    window.lotterySystem = new LotterySystem();
}); 