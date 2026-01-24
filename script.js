// script.js
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

let myRole=null,myName="",maxPlayers=0,isSolo=false;
const soloWords=["사과","고양이","커피","비행기","병원","초콜릿","아이돌"];
let soloAnswer="";

document.querySelectorAll(".mode-btn").forEach(btn=>{
btn.onclick=()=>{
maxPlayers=parseInt(btn.dataset.max);
if(maxPlayers===1){startSoloGame();return;}
gameDoc.set({maxPlayers,names:{},words:{},chat:[]});
modeScreen.style.display="none";
showRoleButtons();
};
});

function showRoleButtons(){
roleButtons.innerHTML="";
for(let i=0;i<maxPlayers;i++){
let b=document.createElement("button");
b.innerText="플레이어 "+(i+1);
b.onclick=()=>{myRole=i;setupScreen.style.display="none";nameScreen.style.display="block";}
roleButtons.appendChild(b);
}
setupScreen.style.display="block";
}

saveNameBtn.onclick=()=>{
myName=userName.value.trim();
if(!myName)return;
const u={};u[`names.${myRole}`]=myName;
gameDoc.update(u);
nameScreen.style.display="none";
listenGame();
};

saveWordBtn.onclick=()=>{
const w=secretWord.value.trim();
if(!w)return;
const u={};u[`words.${myRole}`]=w;
gameDoc.update(u);
wordScreen.style.display="none";
};

function listenGame(){
gameDoc.onSnapshot(doc=>{
const d=doc.data();
if(!d)return;
const names=d.names||{},words=d.words||{};
if(Object.keys(words).length<maxPlayers){
wordScreen.style.display="block";
wordTitle.innerText=(Object.keys(words).length===myRole)?"제시어 입력":"대기중...";
return;
}
gameScreen.style.display="block";
headerRow.innerHTML="";statusRow.innerHTML="";
for(let i=0;i<maxPlayers;i++){
let th=document.createElement("th");
th.innerText=names[i]||"플레이어";
headerRow.appendChild(th);

let td=document.createElement("td");
if(i===myRole){td.innerText="??? (내 제시어)";td.style.color="gray";}
else{td.innerText=words[i];td.style.color="blue";}
statusRow.appendChild(td);
}
});
}

function startSoloGame(){
isSolo=true;
modeScreen.style.display="none";
gameScreen.style.display="block";
soloAnswer=soloWords[Math.floor(Math.random()*soloWords.length)];
turnIndicator.innerText="🎯 랜덤 단어 맞추기";
chatBox.innerHTML="컴퓨터가 단어를 정했습니다!";
}

sendAnswerBtn.onclick=()=>{
const a=answerInput.value.trim();
if(isSolo){
alert(a===soloAnswer?"🎉 정답!":"❌ 오답!");
}
};