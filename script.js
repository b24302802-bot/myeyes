// --- 1. Firebase 初始化設定 ---
// 請將下方物件替換成你在 Firebase 後台拿到的實際 Config 內容
const firebaseConfig = {
	  apiKey: "AIzaSyANVoHhbUbCQUFgG31V8EAWAm3gFYKvys8",
	  authDomain: "helloworld-dafbf.firebaseapp.com",
	  databaseURL: "https://helloworld-dafbf-default-rtdb.asia-southeast1.firebasedatabase.app",
	  projectId: "helloworld-dafbf",
	  storageBucket: "helloworld-dafbf.firebasestorage.app",
	  messagingSenderId: "712697283373",
	  appId: "1:712697283373:web:11c54d42c91cd7623a89a4",
	  measurementId: "G-1F74GJVVFE"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const clicksRef = database.ref('click_stats/total_clicks'); // 設定資料庫的路徑名稱

// --- 2. 宣告網頁變數 ---
const img = document.getElementById('clickable-image');
const counterDisplay = document.getElementById('counter');
const audio = document.getElementById('click-sound');

let globalCount = 0;       // 畫面上顯示的總次數
let pendingClicks = 0;     // 本地端剛點擊、尚未同步到雲端的次數

// --- 3. 初始化：監聽資料庫的即時數據 ---
// 使用 .on('value', ...) 當資料庫數字一變，全台灣所有打開這網頁的人畫面都會同步更新！
clicksRef.on('value', (snapshot) => {
    const data = snapshot.val();
    // 如果資料庫是空的，預設為 0
    const serverCount = data ? data : 0; 
    
    // 為了防止伺服器數字傳回來時，蓋掉使用者剛剛「正在瘋狂連點」還沒送出的數字
    // 實際顯示的數字 = 雲端最新數字 + 本地還沒送出去的數字
    globalCount = serverCount + pendingClicks;
    counterDisplay.textContent = globalCount;
});

// --- 4. 處理點擊事件 ---
img.addEventListener('pointerdown', (e) => {
    e.preventDefault();

    // 播放音效並重置時間
    audio.currentTime = 0;
    audio.play().catch(err => console.log("音效播放阻擋:", err));

    // 本地端畫面立即反應
    globalCount++;
    pendingClicks++;
    counterDisplay.textContent = globalCount;
});

// --- 5. 解決狂按與覆蓋問題：定時批次同步 ---
setInterval(() => {
    if (pendingClicks > 0) {
        const clicksToSync = pendingClicks;
        pendingClicks = 0; // 立刻清空，準備紀錄下一秒的點擊
        
        // 【核心精髓】：使用 increment 讓資料庫自己做加法
        // 這樣就算 A 和 B 同時送出點擊，資料庫也會排隊把它們加進去，不會互相覆蓋
        clicksRef.set(firebase.database.ServerValue.increment(clicksToSync))
            .catch((error) => {
                console.error("同步失敗:", error);
                // 如果同步失敗，把次數補回去，下一秒重新嘗試
                pendingClicks += clicksToSync; 
            });
    }
}, 1000); // 每 1000 毫秒（1秒）打包送出一次