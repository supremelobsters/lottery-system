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
        
        this.initElements();
        this.disableAllButtons();
        this.initEventListeners();
        this.createStarField();
        this.peopleFileInput.remove(); // 移除第二个文件输入框，因为我们只需要一个
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
        this.prizeFileInput.addEventListener('change', (e) => this.handleExcelFile(e));
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
}

// 初始化抽奖系统
document.addEventListener('DOMContentLoaded', () => {
    window.lotterySystem = new LotterySystem();
}); 