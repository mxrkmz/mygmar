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
let maxPlayers = 1; 
let hasSubmittedWord = false;

const aiWords = ["사과", "기린", "축구", "피아노", "경찰관", "컴퓨터", "우주선", "떡볶이", "강아지", "비행기", "치킨", "아이언맨", "남극", "선생님"];

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    maxPlayers = parseInt(e.target.dataset.max);
    document.getElementById('modeScreen').style.display = 'none';
    if(maxPlayers === 1) { myRole = 0; document.getElementById('nameScreen').style.display = 'block'; }
    else { showRoleButtons(); }
    gameDoc.set({ 
      maxPlayers: maxPlayers, names: {}, words: {}, solved: new Array(maxPlayers).fill(false),
      chat: [], currentTurn: 0, resetVotes: [], gameStarted: false
    }, { merge: false });
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
  const update = {}; update[`names.${myRole}`] = myName;
  if(maxPlayers === 1) update[`names.1`] = "AI 컴퓨터";
  gameDoc.update(update);
  startListening();
});

function startListening() {
  gameDoc.onSnapshot((doc) => {
    const data = doc.data();
    if (!data) return;
    maxPlayers = data.maxPlayers || 1;
    const names = data.names || {};
    const words = data.words || {};
    const solved = data.solved || [];
    const turn = data.currentTurn || 0;

    if (data.resetVotes && data.resetVotes.length >= (maxPlayers === 1 ? 1 : maxPlayers)) {
      location.reload(); return;
    }

    if(maxPlayers === 1 && !words[0]) {
        const randomWord = aiWords[Math.floor(Math.random() * aiWords.length)];
        gameDoc.update({ "words.0": randomWord, "words.1": "AI가 출제함" });
    }

    const wordEntries = Object.keys(words).length;
    if (maxPlayers > 1 && wordEntries < maxPlayers) {
      if (!hasSubmittedWord) { document.getElementById('wordScreen').style.display = 'block'; } 
      else {
        document.getElementById('wordScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('turnIndicator').innerText = "다른 사람 입력 대기 중...";
      }
    } else {
      if (!data.gameStarted && wordEntries >= maxPlayers) { announceStart(names); }
      document.getElementById('wordScreen').style.display = 'none';
      document.getElementById('gameScreen').style.display = 'block';
      const hRow = document.getElementById('headerRow');
      const sRow = document.getElementById('statusRow');
      hRow.innerHTML = ''; sRow.innerHTML = '';
      const displayCount = (maxPlayers === 1) ? 2 : maxPlayers;
      for(let i=0; i < displayCount; i++) {
        const th = document.createElement('th');
        th.innerText = (i === myRole) ? `나(${myName})` : (names[i] || '플레이어');
        th.style.border = "1px solid #ccc"; th.style.padding = "5px";
        hRow.appendChild(th);
        const td = document.createElement('td');
        if (i !== myRole) {
          td.innerText = (maxPlayers === 1 && i === 1) ? "나의 문제 출제됨" : (words[i] || "입력중");
          td.style.color = "blue"; td.style.fontWeight = "bold";
        } else {
          td.innerText = solved[i] ? words[i] : "??? (진행중)";
          td.style.color = solved[i] ? "red" : "black";
        }
        td.style.border = "1px solid #ccc"; td.style.padding = "5px";
        sRow.appendChild(td);
      }
      document.getElementById('turnIndicator').innerText = (turn === myRole) ? "★나의 차례★" : `${names[turn] || '상대'}의 차례`;
      const isMyTurn = (turn === myRole && !solved[myRole]);
      document.getElementById('questionInput').disabled = !isMyTurn;
      document.getElementById('sendQuestionBtn').disabled = !isMyTurn;
      document.getElementById('answerInput').disabled = !isMyTurn;
      document.getElementById('sendAnswerBtn').disabled = !isMyTurn;
      const chatBox = document.getElementById('chatBox');
      chatBox.innerHTML = (data.chat || []).map(msg => `<div>${msg}</div>`).join('');
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
}

function announceStart(names) {
    const firstTurn = Math.floor(Math.random() * maxPlayers);
    gameDoc.update({ 
        gameStarted: true, currentTurn: firstTurn,
        chat: firebase.firestore.FieldValue.arrayUnion(
            `<strong>🎤 사회자 AI:</strong> 게임을 시작합니다!`,
            `<strong>🎤 사회자 AI:</strong> <strong>${names[firstTurn] || "플레이어"}</strong>님, 먼저 질문해주세요!`
        )
    });
}

function askAI(userQuestion, correctWord) {
    let aiResponse = "";
    if (userQuestion.includes("음식")) aiResponse = ["사과", "떡볶이", "치킨"].includes(correctWord) ? "네, 맞아요!" : "아니요.";
    else if (userQuestion.includes("동물")) aiResponse = ["기린", "강아지"].includes(correctWord) ? "네, 맞아요!" : "아니요.";
    else if (userQuestion.includes("글자수")) aiResponse = `정답은 ${correctWord.length}글자입니다.`;
    else aiResponse = correctWord.split('').some(char => userQuestion.includes(char)) ? "포함된 글자가 있네요!" : "글쎄요...";
    setTimeout(() => { gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`<strong>🤖 AI:</strong> ${aiResponse}`) }); }, 1000);
}

document.getElementById('sendQuestionBtn').addEventListener('click', () => {
  const msg = document.getElementById('questionInput').value.trim();
  if (!msg) return;
  gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`<strong>❓ ${myName}:</strong> ${msg}`) });
  document.getElementById('questionInput').value = "";
  if(maxPlayers === 1) { gameDoc.get().then(doc => { askAI(msg, doc.data().words[0]); }); } else { passTurn(); }
});

document.getElementById('sendReplyBtn').addEventListener('click', () => {
  const msg = document.getElementById('replyInput').value.trim();
  if (!msg) return;
  gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`<span>💬 <strong>${myName}:</strong> ${msg}</span>`) });
  document.getElementById('replyInput').value = "";
});

document.getElementById('sendAnswerBtn').addEventListener('click', () => {
  const answer = document.getElementById('answerInput').value.trim();
  gameDoc.get().then(doc => {
    const data = doc.data();
    if (answer === data.words[myRole]) {
      const newSolved = data.solved; newSolved[myRole] = true;
      gameDoc.update({ solved: newSolved, chat: firebase.firestore.FieldValue.arrayUnion(`🎉 ${myName} 정답 [${answer}]!`) });
      if(maxPlayers > 1) passTurn();
    } else { alert("오답!"); if(maxPlayers > 1) passTurn(); }
  });
});

async function passTurn() {
  const doc = await gameDoc.get();
  const data = doc.data();
  let nextTurn = (data.currentTurn + 1) % maxPlayers;
  while (data.solved[nextTurn] && !data.solved.every(v => v === true)) { nextTurn = (nextTurn + 1) % maxPlayers; }
  gameDoc.update({ currentTurn: nextTurn });
}

document.getElementById('saveWordBtn').addEventListener('click', () => {
  const word = document.getElementById('secretWord').value.trim();
  if (!word) return;
  const targetRole = (myRole + 1) % maxPlayers;
  const update = {}; update[`words.${targetRole}`] = word;
  gameDoc.update(update).then(() => { hasSubmittedWord = true; document.getElementById('wordScreen').style.display = 'none'; });
});

document.getElementById('resetBtn').addEventListener('click', () => {
  gameDoc.update({ resetVotes: firebase.firestore.FieldValue.arrayUnion(myName) });
});
