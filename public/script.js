(async () => {
  const res = await fetch("/ping", {
    method: "GET",
  });
  if (!res.ok) alert("サーバーはオフラインです");
})();
const token = localStorage.getItem("token");
if (!token) {
  location.href = "./login.html";
}
function logout() {
  localStorage.removeItem("token");
  location.href = "./login.html";
}
(async () => {
  try {
    let data = await fetch("/getdata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token }),
    });
    if (!data.ok) {
      localStorage.removeItem("token");
      location.href = "./login.html";
      return;
    }
    data = await data.json();
    const username = data.name;
    const rankpoint = data.RP;
    const win = data.win;
    const lose = data.lose;
    const draw = data.draw;
    const winrate = Math.floor((win / (win + lose)) * 100);
    document.getElementById("user").textContent = "ユーザーネーム：" + username;
    document.getElementById("point").textContent =
      "ランクポイント：" + rankpoint;
    document.getElementById("win").textContent = "勝利数：" + win;
    document.getElementById("lose").textContent = "敗北数：" + lose;
    document.getElementById("draw").textContent = "引き分け数：" + draw;
    document.getElementById("winrate").textContent = "勝率：" + winrate + "%";
  } catch (e) {
    localStorage.removeItem("token");
    location.href = "./login.html";
    return;
  }
})();
