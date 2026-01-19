const firebaseConfig = {
  apiKey: "AIzaSyAX6OTYKSekypXqbgNCDyJPm88yXlI48S0", 
  authDomain: "what-s-my-name-160a1.firebaseapp.com",
  projectId: "what-s-my-name-160a1",
  storageBucket: "what-s-my-name-160a1.appspot.com",
  messagingSenderId: "450583959142",
  appId: "1:450583959142:web:5074f456350f5581977717"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const gameDoc = db.collection("games").doc("session1");

let myRole = null;
let myName = ""; // 사용자 이름을 저장할 변수

// 1. 플레이어 선택
document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    myRole = parseInt(e.target.dataset.role);
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('nameScreen').style.display = 'block'; // 이름 입력창 띄우기
  });
});

// 2. 이름 저장 확인 버튼
document.getElementById('saveNameBtn').addEventListener('click', () => {
  myName = document.getElementById('userName').value.trim();
  if (!myName) {
    alert("이름을 입력해주세요!");
    return;
  }
  document.getElementById('nameScreen').style.display = 'none';
  startListening(); // 게임 데이터 감시 시작
});

function startListening() {
  gameDoc.onSnapshot((doc) => {
    if (!doc.exists) {
      gameDoc.set({ words: {}, chat: [] });
      return;
    }
    const data = doc.data();
    const wordEntries = data.words || {};
    const wordCount = Object.keys(wordEntries).length;

    // 제시어 단계
    if (wordCount < 3) {
      document.getElementById('wordScreen').style.display = 'block';
      const isMyTurn = (wordCount === myRole);
      
      if (isMyTurn) {
        document.getElementById('wordTitle').innerText = `${myName}님, 제시어를 입력할 차례입니다!`;
        document.getElementById('secretWord').disabled = false;
        document.getElementById('saveWordBtn').disabled = false;
      } else {
        document.getElementById('wordTitle').innerText = "다른 플레이어가 제시어를 입력 중입니다...";
        document.getElementById('secretWord').disabled = true;
        document.getElementById('saveWordBtn').disabled = true;
      }
    } 
    // 채팅 단계
    else {
      document.getElementById('wordScreen').style.display = 'none';
      document.getElementById('gameScreen').style.display = 'block';
      const chatHtml = (data.chat || []).map(msg => `<div>${msg}</div>`).join('');
      document.getElementById('chatBox').innerHTML = chatHtml;
      document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
    }
  });
}

// 제시어 저장
document.getElementById('saveWordBtn').addEventListener('click', () => {
  const word = document.getElementById('secretWord').value.trim();
  if (!word) return;
  const updateData = {};
  updateData[`words.${myRole}`] = word;
  gameDoc.update(updateData);
  document.getElementById('secretWord').value = "";
});

// 채팅 전송
document.getElementById('sendBtn').addEventListener('click', () => {
  const msg = document.getElementById('questionInput').value.trim();
  if (!msg) return;
  
  // 채팅창에 '이름: 메시지' 형식으로 저장
  gameDoc.update({
    chat: firebase.firestore.FieldValue.arrayUnion(`<strong>${myName}</strong>: ${msg}`)
  });
  document.getElementById('questionInput').value = "";
});