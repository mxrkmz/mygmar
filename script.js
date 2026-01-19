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
let isSolved = false;
let currentTurn = 0; // 0:A, 1:B, 2:C
let resetVoted = false;
let autoSuggestReset = false;

document.querySelectorAll('.role-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    myRole = parseInt(e.target.dataset.role);
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('nameScreen').style.display = 'block';
  });
});

document.getElementById('saveNameBtn').addEventListener('click', () => {
  myName = document.getElementById('userName').value.trim();
  if (!myName) return;
  document.getElementById('nameScreen').style.display = 'none';
  const nameUpdate = {};
  nameUpdate[`names.${myRole}`] = myName;
  gameDoc.update(nameUpdate);
  startListening();
});

function startListening() {
  gameDoc.onSnapshot((doc) => {
    if (!doc.exists) {
      gameDoc.set({ words: {}, chat: [], resetVotes: [], solved: [false, false, false], names: ["?", "?", "?"], currentTurn: 0 });
      return;
    }
    const data = doc.data();
    if (data.resetVotes && data.resetVotes.length >= 3) {
      gameDoc.update({ words: {}, chat: [], resetVotes: [], solved: [false, false, false], names: ["?", "?", "?"], currentTurn: 0 }).then(() => {
        location.reload();
      });
      return;
    }

    currentTurn = data.currentTurn || 0;
    const solvedArr = data.solved || [false, false, false];
    const namesArr = data.names || ["?", "?", "?"];
    const wordsArr = data.words || {};

    const wordCount = Object.keys(wordsArr).length;
    if (wordCount < 3) {
      document.getElementById('wordScreen').style.display = 'block';
      const isMyTurnToSet = (wordCount === myRole);
      document.getElementById('wordTitle').innerText = isMyTurnToSet ? `${myName}님 차례!` : "다른 플레이어 입력 대기 중...";
    } else {
      document.getElementById('wordScreen').style.display = 'none';
      document.getElementById('gameScreen').style.display = 'block';
      
      const chatHtml = (data.chat || []).map(msg => `<div>${msg}</div>`).join('');
      const chatBox = document.getElementById('chatBox');
      chatBox.innerHTML = chatHtml;
      chatBox.scrollTop = chatBox.scrollHeight;

      // 턴 표시 업데이트
      const turnName = (currentTurn === myRole) ? "★나의 차례★" : `${namesArr[currentTurn]}님의 차례`;
      const turnIndicator = document.getElementById('turnIndicator');
      turnIndicator.innerText = turnName;
      turnIndicator.style.background = (currentTurn === myRole) ? "#d1ecf1" : "#fff3cd";

      // 입력창 활성화/비활성화
      const isMyTurnAction = (currentTurn === myRole && !isSolved);
      document.getElementById('questionInput').disabled = !isMyTurnAction;
      document.getElementById('sendQuestionBtn').disabled = !isMyTurnAction;
      document.getElementById('answerInput').disabled = !isMyTurnAction;
      document.getElementById('sendAnswerBtn').disabled = !isMyTurnAction;

      solvedArr.forEach((s, i) => {
        document.getElementById(`h${i}`).innerText = (i === myRole) ? `나(${myName})` : namesArr[i];
        const statusEl = document.getElementById(`status${i}`);
        if (i !== myRole) {
          statusEl.innerText = wordsArr[i] || "입력중";
          statusEl.style.color = "blue";
        } else {
          statusEl.innerText = s ? wordsArr[i] : "??? (진행중)";
          statusEl.style.color = s ? "red" : "black";
        }
      });

      if (solvedArr.every(val => val === true) && !autoSuggestReset) {
        autoSuggestReset = true;
        gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`📢 <strong>모두 정답을 맞혔습니다! 다시하시겠어요?</strong>`) });
      }
      document.getElementById('resetStatus').innerText = `다시하기 투표: ${data.resetVotes ? data.resetVotes.length : 0}/3`;
    }
  });
}

// 다음 턴으로 넘기는 함수 (정답 맞힌 사람은 건너뜀)
async function passTurn() {
  const doc = await gameDoc.get();
  const data = doc.data();
  const solvedArr = data.solved;
  let nextTurn = (data.currentTurn + 1) % 3;
  
  // 모든 사람이 다 맞히지 않았다면, 아직 못 맞힌 사람을 찾을 때까지 넘김
  if (!solvedArr.every(v => v === true)) {
    while (solvedArr[nextTurn]) {
      nextTurn = (nextTurn + 1) % 3;
    }
  }
  gameDoc.update({ currentTurn: nextTurn });
}

document.getElementById('saveWordBtn').addEventListener('click', () => {
  const word = document.getElementById('secretWord').value.trim();
  if (!word) return;
  const updateData = {};
  updateData[`words.${myRole}`] = word;
  gameDoc.update(updateData);
});

document.getElementById('sendQuestionBtn').addEventListener('click', () => {
  if (currentTurn !== myRole) return;
  const msg = document.getElementById('questionInput').value.trim();
  if (!msg) return;
  gameDoc.update({ 
    chat: firebase.firestore.FieldValue.arrayUnion(`<strong>${myName}:</strong> ${msg}`) 
  });
  document.getElementById('questionInput').value = "";
  passTurn(); // 질문 후 턴 넘김
});

document.getElementById('sendAnswerBtn').addEventListener('click', () => {
  if (currentTurn !== myRole || isSolved) return;
  const answer = document.getElementById('answerInput').value.trim();
  gameDoc.get().then((doc) => {
    const data = doc.data();
    if (answer === data.words[myRole]) {
      isSolved = true;
      const solvedArr = data.solved || [false, false, false];
      solvedArr[myRole] = true;
      
      gameDoc.update({ 
        solved: solvedArr, 
        chat: firebase.firestore.FieldValue.arrayUnion(`🎉 ${myName}님이 본인의 정답 [${answer}]을 맞혔습니다!`) 
      });
      
      document.getElementById('inputArea').innerHTML = `<p style="color:blue; font-weight:bold;">정답입니다! 다른 친구들을 도와주세요.</p>`;
      passTurn(); // 맞혀도 다음 사람 차례로
    } else {
      alert("틀렸습니다! 순서가 넘어갑니다.");
      document.getElementById('answerInput').value = "";
      gameDoc.update({ 
        chat: firebase.firestore.FieldValue.arrayUnion(`❌ ${myName}님이 정답에 도전했지만 틀렸습니다!`) 
      });
      passTurn(); // 틀리면 즉시 턴 넘김
    }
  });
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (resetVoted) return;
  resetVoted = true;
  document.getElementById('resetBtn').disabled = true;
  gameDoc.update({
    resetVotes: firebase.firestore.FieldValue.arrayUnion(myName),
    chat: firebase.firestore.FieldValue.arrayUnion(`🔄 ${myName}님이 다시하기를 요청했습니다.`)
  });
});
