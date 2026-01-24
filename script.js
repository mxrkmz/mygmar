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
let isSolved = false;
let hasSubmittedWord = false;

// AI용 단어 리스트
const aiWords = ["사과", "기린", "축구", "피아노", "경찰관", "컴퓨터", "우주선", "떡볶이", "강아지", "비행기", "치킨", "아이언맨", "남극", "선생님"];

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    maxPlayers = parseInt(e.target.dataset.max);
    document.getElementById('modeScreen').style.display = 'none';
    if(maxPlayers === 1) { myRole = 0; document.getElementById('nameScreen').style.display = 'block'; }
    else { showRoleButtons(); }
    gameDoc.set({ 
      maxPlayers: maxPlayers, names: {}, words: {}, solved: new Array(maxPlayers).fill(false),
      chat: [`📢 ${maxPlayers}인용 모드 시작!`], currentTurn: 0, resetVotes: []
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

    // AI 단어 세팅 (내가 맞춰야 할 정답)
    if(maxPlayers === 1 && !words[0]) {
        const randomWord = aiWords[Math.floor(Math.random() * aiWords.length)];
        gameDoc.update({ "words.0": randomWord, "words.1": "AI가 출제함" });
    }

    const wordEntries = Object.keys(words).length;
    if (maxPlayers > 1 && wordEntries < maxPlayers) {
      if (!hasSubmittedWord) {
        document.getElementById('wordScreen').style.display = 'block';
      } else {
        document.getElementById('wordScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
        document.getElementById('turnIndicator').innerText = "다른 사람 입력 대기 중...";
      }
    } else {
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

      document.getElementById('turnIndicator').innerText = (turn === myRole) ? "★나의 차례★" : "AI 응답 대기 중...";
      const isMyTurn = (turn === myRole && !solved[myRole]);
      document.getElementById('questionInput').disabled = !isMyTurn;
      document.getElementById('sendQuestionBtn').disabled = !isMyTurn;
      document.getElementById('answerInput').disabled = !isMyTurn;
      document.getElementById('sendAnswerBtn').disabled = !isMyTurn;

      const chatBox = document.getElementById('chatBox');
      chatBox.innerHTML = (data.chat || []).map(msg => `<div>${msg}</div>`).join('');
      chatBox.scrollTop = chatBox.scrollHeight;
      document.getElementById('resetStatus').innerText = `초기화 투표: ${data.resetVotes ? data.resetVotes.length : 0}/${maxPlayers}`;
    }
  });
}

// AI 자동 답변 로직
function askAI(userQuestion, correctWord) {
    let aiResponse = "";
    // 아주 간단한 키워드 매칭 답변 로직
    if (userQuestion.includes("이름") || userQuestion.includes("누구")) {
        aiResponse = "그건 당신이 맞춰야 할 이름이에요!";
    } else if (userQuestion.includes("음식") || userQuestion.includes("먹는")) {
        aiResponse = ["사과", "떡볶이", "치킨"].includes(correctWord) ? "네, 맞아요! 먹는 거예요." : "아니요, 먹는 게 아니에요.";
    } else if (userQuestion.includes("동물") || userQuestion.includes("생물")) {
        aiResponse = ["기린", "강아지"].includes(correctWord) ? "네, 살아있는 동물이에요." : "아니요, 동물이 아니에요.";
    } else if (userQuestion.includes("글자수") || userQuestion.includes("몇 글자")) {
        aiResponse = `정답은 ${correctWord.length}글자입니다!`;
    } else {
        // 단어 포함 여부 체크
        if (correctWord.split('').some(char => userQuestion.includes(char))) {
            aiResponse = "힌트: 당신이 말한 글자 중 정답에 포함된 글자가 있네요!";
        } else {
            aiResponse = "글쎄요... 다른 질문을 해보시겠어요? (예: 먹는 건가요? 동인가요? 몇 글자인가요?)";
        }
    }
    
    setTimeout(() => {
        gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`<strong>🤖 AI:</strong> ${aiResponse}`) });
    }, 1000);
}

document.getElementById('sendQuestionBtn').addEventListener('click', () => {
  const msg = document.getElementById('questionInput').value.trim();
  if (!msg) return;
  gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`<strong>${myName}:</strong> ${msg}`) });
  document.getElementById('questionInput').value = "";
  
  if(maxPlayers === 1) {
      gameDoc.get().then(doc => {
          const data = doc.data();
          askAI(msg, data.words[0]); // AI에게 질문 전달
      });
  } else {
      passTurn();
  }
});

document.getElementById('sendAnswerBtn').addEventListener('click', () => {
  const answer = document.getElementById('answerInput').value.trim();
  gameDoc.get().then(doc => {
    const data = doc.data();
    if (answer === data.words[myRole]) {
      const newSolved = data.solved; newSolved[myRole] = true;
      gameDoc.update({ solved: newSolved, chat: firebase.firestore.FieldValue.arrayUnion(`🎉 ${myName} 정답 [${answer}]!`) });
      if(maxPlayers > 1) passTurn();
    } else { 
        alert("오답입니다!"); 
        if(maxPlayers === 1) {
            gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`<strong>🤖 AI:</strong> 아쉽네요! '${answer}'은(는) 정답이 아닙니다.`) });
        } else {
            passTurn();
        }
    }
  });
});

document.getElementById('resetBtn').addEventListener('click', () => {
  gameDoc.update({ resetVotes: firebase.firestore.FieldValue.arrayUnion(myName) });
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
