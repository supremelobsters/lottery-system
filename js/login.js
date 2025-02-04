function validateKey() {
    const cardKey = document.getElementById('cardKey').value;
    const errorMsg = document.getElementById('errorMsg');
    
    // 验证卡密格式
    if (!/^[A-Za-z0-9]{16}$/.test(cardKey)) {
        showError('请输入16位数字和字母组合的卡密');
        return;
    }

    // 验证卡密是否有效
    const validKeys = getValidKeys();
    const keyInfo = validKeys[cardKey];

    if (!keyInfo) {
        showError('无效的卡密');
        return;
    }

    // 验证卡密是否过期
    const now = new Date().getTime();
    if (keyInfo.activated && now > (keyInfo.activateTime + 24 * 60 * 60 * 1000)) {
        showError('卡密已过期');
        return;
    }

    // 如果是首次使用，激活卡密
    if (!keyInfo.activated) {
        keyInfo.activated = true;
        keyInfo.activateTime = now;
        // 更新存储
        validKeys[cardKey] = keyInfo;
        localStorage.setItem('validKeys', JSON.stringify(validKeys));
    }

    // 验证通过，保存登录状态
    localStorage.setItem('lotteryLoginKey', cardKey);
    localStorage.setItem('lotteryLoginExpire', keyInfo.activateTime + 24 * 60 * 60 * 1000);
    
    // 跳转到抽奖页面
    window.location.href = 'lottery.html';
}

function showError(message) {
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
}

function getValidKeys() {
    // 从本地存储获取卡密列表
    const stored = localStorage.getItem('validKeys');
    return stored ? JSON.parse(stored) : {};
} 