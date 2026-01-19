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
let myName = "";
let maxPlayers = 3; 
let isSolved = false;
let resetVoted = false;

// 1. 인원 모드 선택
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    maxPlayers = parseInt(e.target.dataset.max);
    gameDoc.set({ maxPlayers: maxPlayers }, { merge: true });
    showRoleButtons();
  });
});

function showRoleButtons() {
  const container = document.getElementById('roleButtons');
  container.innerHTML = '';
  for(let i=0; i<maxPlayers; i++) {
    const btn = document.createElement('button');
    btn.innerText = `플레이어 ${String.fromCharCode(65 + i)}`;
    btn.onclick = () => selectRole(i);
    container.appendChild(btn);
  }
  document.getElementById('modeScreen').style.display = 'none';
  document.getElementById('setupScreen').style.display = 'block';
}

function selectRole(role) {
  myRole = role;
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('nameScreen').style.display = 'block';
}

document.getElementById('saveNameBtn').addEventListener('click', () => {
  myName = document.getElementById('userName').value.trim();
  if (!myName) return;
  document.getElementById('nameScreen').style.display = 'none';
  const update = {};
  update[`names.${myRole}`] = myName;
  gameDoc.update(update);
  startListening();
});

function startListening() {
  gameDoc.onSnapshot((doc) => {
    const data = doc.data();
    if (!data) return;

    maxPlayers = data.maxPlayers || 3;
    const names = data.names || {};
    const words = data.words || {};
    const solved = data.solved || new Array(maxPlayers).fill(false);
    const turn = data.currentTurn || 0;

    // 다시하기 로직
    if (data.resetVotes && data.resetVotes.length >= maxPlayers) {
      gameDoc.set({ chat: [], resetVotes: [], solved: new Array(maxPlayers).fill(false), names: {}, words: {}, currentTurn: 0, maxPlayers: maxPlayers });
      location.reload();
      return;
    }

    // 제시어 입력 단계 체크
    const wordCount = Object.keys(words).length;
    if (wordCount < maxPlayers) {
      document.getElementById('wordScreen').style.display = 'block';
      document.getElementById('wordTitle').innerText = (wordCount === myRole) ? `${myName}님 차례!` : "대기 중...";
    } else {
      document.getElementById('wordScreen').style.display = 'none';
      document.getElementById('gameScreen').style.display = 'block';

      // 현황판 동적 생성
      const hRow = document.getElementById('headerRow');
      const sRow = document.getElementById('statusRow');
      hRow.innerHTML = ''; sRow.innerHTML = '';

      for(let i=0; i<maxPlayers; i++) {
        const th = document.createElement('th');
        th.innerText = (i === myRole) ? `나(${myName})` : (names[i] || '입력중');
        th.style.border = "1px solid #ccc"; th.style.padding = "5px";
        hRow.appendChild(th);

        const td = document.createElement('td');
        if (i !== myRole) {
          td.innerText = words[i] || "입력중";
          td.style.color = "blue";
        } else {
          td.innerText = solved[i] ? words[i] : "??? (진행중)";
          td.style.color = solved[i] ? "red" : "black";
        }
        td.style.border = "1px solid #ccc"; td.style.padding = "5px";
        sRow.appendChild(td);
      }

      // 턴 및 채팅 업데이트 (기존 로직과 동일)
      document.getElementById('turnIndicator').innerText = (turn === myRole) ? "★나의 차례★" : `${names[turn] || '...'}님의 차례`;
      const isMyTurn = (turn === myRole && !solved[myRole]);
      document.getElementById('sendQuestionBtn').disabled = !isMyTurn;
      document.getElementById('sendAnswerBtn').disabled = !isMyTurn;

      const chatBox = document.getElementById('chatBox');
      chatBox.innerHTML = (data.chat || []).map(msg => `<div>${msg}</div>`).join('');
      chatBox.scrollTop = chatBox.scrollHeight;
      
      if (solved.every(v => v === true)) {
         gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`📢 <strong>모두 정답! 다시하시겠어요?</strong>`) });
      }
      document.getElementById('resetStatus').innerText = `다시하기 투표: ${data.resetVotes ? data.resetVotes.length : 0}/${maxPlayers}`;
    }
  });
}

// 나머지 질문/정답/패스턴 함수는 이전과 동일하게 유지하되 인원수(maxPlayers)만 변수로 사용
async function passTurn() {
  const doc = await gameDoc.get();
  const data = doc.data();
  let nextTurn = (data.currentTurn + 1) % maxPlayers;
  while (data.solved[nextTurn] && !data.solved.every(v => v === true)) {
    nextTurn = (nextTurn + 1) % maxPlayers;
  }
  gameDoc.update({ currentTurn: nextTurn });
}

document.getElementById('saveWordBtn').addEventListener('click', () => {
  const word = document.getElementById('secretWord').value.trim();
  const update = {}; update[`words.${myRole}`] = word;
  gameDoc.update(update);
});

document.getElementById('sendQuestionBtn').addEventListener('click', () => {
  const msg = document.getElementById('questionInput').value.trim();
  if (!msg) return;
  gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`<strong>${myName}:</strong> ${msg}`) });
  document.getElementById('questionInput').value = "";
  passTurn();
});

document.getElementById('sendAnswerBtn').addEventListener('click', () => {
  const answer = document.getElementById('answerInput').value.trim();
  gameDoc.get().then(doc => {
    const data = doc.data();
    if (answer === data.words[myRole]) {
      const newSolved = data.solved || new Array(maxPlayers).fill(false);
      newSolved[myRole] = true;
      gameDoc.update({ solved: newSolved, chat: firebase.firestore.FieldValue.arrayUnion(`🎉 ${myName} 정답 [${answer}]!`) });
      passTurn();
    } else {
      alert("오답!"); passTurn();
    }
  });
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (resetVoted) return;
  resetVoted = true;
  gameDoc.update({ resetVotes: firebase.firestore.FieldValue.arrayUnion(myName) });
});
