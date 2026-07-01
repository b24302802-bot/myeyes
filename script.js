let userId = localStorage.getItem('poptama_userId');
let userName = localStorage.getItem('poptama_userName');

if (!userId || !userName) {
    userName = prompt("歡迎加入超級小玉杯：", "Guest");
    if (!userName) userName = "Guest";

    userId = 'user_' + Math.random().toString(36).substr(2, 9);

    localStorage.setItem('poptama_userId', userId);
    localStorage.setItem('poptama_userName', userName);
}

document.getElementById('player-name-display').textContent = userName;

// 2. Firebase 初始化
const firebaseConfig = {
    apiKey: "AIzaSyANVoHhbUbCQUFgG31V8EAWAm3gFYKvys8",
    authDomain: "helloworld-dafbf.firebaseapp.com",
    databaseURL: "https://helloworld-dafbf-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "helloworld-dafbf",
    storageBucket: "helloworld-dafbf.firebasestorage.app",
    messagingSenderId: "712697283373",
    appId: "1:712697283373:web:11c54d42c91cd7623a89a4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
// [新增] 改名按鈕事件監聽器
document.getElementById('edit-name-btn').addEventListener('click', () => {
    let newName = prompt("請輸入新的英雄暱稱：", userName);
    // 確認玩家有輸入東西，且不是一堆空白
    if (newName !== null && newName.trim() !== "") {
        userName = newName.trim();

        // 1. 更新瀏覽器本地記憶
        localStorage.setItem('poptama_userName', userName);
        // 2. 更新畫面上顯示的名字
        document.getElementById('player-name-display').textContent = userName;
        // 3. 立即更新到 Firebase 資料庫，讓排行榜同步變更
        db.ref('users/' + userId + '/name').set(userName);
    }
});


// 3. 網頁元件綁定
const img = document.getElementById('clickable-image');
const globalCounterDisplay = document.getElementById('counter');
const personalCounterDisplay = document.getElementById('personal-counter');
const audio = document.getElementById('click-sound');
const leaderboardList = document.getElementById('leaderboard-list');

let globalCount = 0;
let personalCount = 0;
let pendingClicks = 0;

// 4. 資料庫監聽：更新總數
db.ref('click_stats/total_clicks').on('value', (snap) => {
    globalCount = snap.val() || 0;
    globalCounterDisplay.textContent = globalCount + pendingClicks;
});

// 5. 資料庫監聽：更新個人分數
db.ref('users/' + userId + '/clicks').on('value', (snap) => {
    personalCount = snap.val() || 0;
    personalCounterDisplay.textContent = personalCount + pendingClicks;
});

// 6. 資料庫監聽：繪製排行榜
db.ref('users').orderByChild('clicks').limitToLast(10).on('value', (snap) => {
    let sortedUsers = [];
    snap.forEach(childSnap => {
        sortedUsers.push({ id: childSnap.key, ...childSnap.val() });
    });
    // 分數從高排到低
    sortedUsers.reverse();

    // 清空舊清單
    leaderboardList.innerHTML = '';

    // 透過 JavaScript 產生乾淨的 HTML 標籤
    sortedUsers.forEach((user, index) => {
        let rank = index + 1;
        let isMe = user.id === userId;

        // 決定前面的名次圈圈要套用什麼 CSS 樣式
        let rankClass = "rank-number";
        if (rank === 1) rankClass += " rank-1";
        else if (rank === 2) rankClass += " rank-2";
        else if (rank === 3) rankClass += " rank-3";

        let li = document.createElement('li');
        // 如果是自己，就加上 is-me 的 CSS 類別
        li.className = isMe ? "rank-item is-me" : "rank-item";

        li.innerHTML = `
                    <div class="rank-info">
                        <span class="${rankClass}">${rank}</span>
                        <span class="rank-name">${user.name}</span>
                    </div>
                    <span class="rank-score">${(user.clicks || 0).toLocaleString()}</span>
                `;
        leaderboardList.appendChild(li);
    });
});

// 7. 點擊與音效處理
img.addEventListener('pointerdown', (e) => {
    e.preventDefault();

    audio.currentTime = 0;
    audio.play().catch(err => console.log("音效播放阻擋:", err));

    pendingClicks++;

    globalCounterDisplay.textContent = globalCount + pendingClicks;
    personalCounterDisplay.textContent = personalCount + pendingClicks;
});

// 8. 每秒批次上傳至資料庫
setInterval(() => {
    if (pendingClicks > 0) {
        const clicksToSync = pendingClicks;
        pendingClicks = 0;

        let updates = {};
        updates['click_stats/total_clicks'] = firebase.database.ServerValue.increment(clicksToSync);
        updates['users/' + userId + '/clicks'] = firebase.database.ServerValue.increment(clicksToSync);
        updates['users/' + userId + '/name'] = userName;

        db.ref().update(updates).catch(error => {
            console.error("同步失敗", error);
            pendingClicks += clicksToSync;
        });
    }
}, 1000);