const message = document.getElementById("message");
const token = localStorage.getItem("token");
if (!token) {
  alert("ログインしてください");
  location.href = "./login.html";
}
try {
  const ws = new WebSocket("ws://192.168.10.103:3000");
} catch (e) {
  alert("サーバーに接続できませんでした。");
  location.href = "/";
}
ws.onopen = () => {
  ws.send(JSON.stringify({ type: "battle", token: token }));
};

let shape;
let opponentName;
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "error") {
    alert(data.message);
    location.href = "/";
    return;
  }
  if (data.type === "info") {
    console.log(data.message);
    return;
  }
  if (data.type === "waiting") {
    message.textContent = "マッチング中...";
    return;
  }
  if (data.type === "start") {
    message.textContent = "対戦相手が決まりました！";
    document.getElementById("backTitle").classList.add("hide");
    shape = data.shape;
    opponentName = shape === "O" ? data.names[1] : data.names[0];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const cell = document.getElementById(`${i},${j}`);
        cell.addEventListener("click", () => {
          ws.send(
            JSON.stringify({
              type: "move",
              gameId: data.gameId,
              x: j,
              y: i,
              shape: shape,
            })
          );
        });
        cell.style.cursor = "pointer";
      }
    }
    document.getElementById("board").classList.remove("hide");
    if (shape === "O") {
      message.textContent = "あなたの番です！→" + shape;
    } else {
      message.textContent = opponentName + "の番です！";
    }
  }
  //あなた番ではない等の警告メッセージ
  if (data.type === "gameError") {
    message.textContent = data.message;
  }
  const backTitle = document.getElementById("backTitle");
  const re = document.getElementById("re");
  if (data.type === "timeout") {
    if (data.turnShape === shape) {
      message.innerHTML =
        "あなたの番で時間切れです！<br>" + opponentName + "の勝ちです！";
      backTitle.classList.remove("hide");
      re.classList.remove("hide");
      return;
    }
    message.innerHTML = "相手の番で時間切れです！<br>あなたの勝ちです！";
    backTitle.classList.remove("hide");
    re.classList.remove("hide");
    return;
  }
  if (data.type === "winner") {
    message.textContent = "あなたの勝ちです！";
    backTitle.classList.remove("hide");
    re.classList.remove("hide");
    return;
  }
  if (data.type === "loser") {
    backTitle.classList.remove("hide");
    re.classList.remove("hide");
    message.textContent = "あなたの負けです！";
    return;
  }
  if (data.type === "draw") {
    backTitle.classList.remove("hide");
    re.classList.remove("hide");
    message.textContent = "引き分けです！";
    return;
  }
  if (data.type === "move") {
    const cell = document.getElementById(`${data.y},${data.x}`);
    cell.textContent = data.shape;
    cell.style.cursor = "not-allowed";
    if (data.shape === shape) {
      message.textContent = opponentName + "の番です！";
    } else {
      message.textContent = "あなたの番です！→" + shape;
    }
  }
};
ws.onclose = () => {
  location.href = "/";
};
