// (기존 코드 생략...)

// 2단계: 답변 입력 기능 (순서와 상관없이 언제든 가능)
document.getElementById('sendReplyBtn').addEventListener('click', () => {
  const msg = document.getElementById('replyInput').value.trim();
  if (!msg) return;
  // 답변은 채팅창에 바로 추가하지만, 턴은 넘기지 않음
  gameDoc.update({ 
    chat: firebase.firestore.FieldValue.arrayUnion(`<span>💬 <strong>${myName}:</strong> ${msg}</span>`) 
  });
  document.getElementById('replyInput').value = "";
});

// 1단계: 질문 입력 (기존 로직 유지)
document.getElementById('sendQuestionBtn').addEventListener('click', () => {
  const msg = document.getElementById('questionInput').value.trim();
  if (!msg) return;
  gameDoc.update({ chat: firebase.firestore.FieldValue.arrayUnion(`<strong>❓ ${myName}:</strong> ${msg}`) });
  document.getElementById('questionInput').value = "";
  if(maxPlayers > 1) passTurn(); // 질문하면 턴이 넘어감
});

// 3단계: 정답 확인 (기존 로직 유지)
// (이하 코드 생략...)
