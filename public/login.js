(async () => {
  const res = await fetch("/ping", {
    method: "GET",
  });
  if (!res.ok) alert("サーバーはオフラインです");
})();
if (localStorage.getItem("token")) {
  location.href = "/";
}
const message = document.getElementById("message");
async function login() {
  const name = document.getElementById("login-name").value;
  const pass = document.getElementById("login-pass").value;
  if (name === "" || pass === "") {
    return (message.textContent = "すべて入力してください");
  }
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      pass: pass,
    }),
  });
  if (!res.ok) {
    const data = await res.text();
    message.textContent = data;
  } else {
    const token = await res.text();
    localStorage.setItem("token", token);
    location.href = "/";
  }
}
async function register() {
  const name = document.getElementById("register-name").value;
  const pass = document.getElementById("register-pass").value;
  const repass = document.getElementById("repass").value;
  if (!name.trim() || !pass.trim() || !repass.trim())
    return (message.textContent = "すべて入力してください");
  if (pass !== repass)
    return (message.textContent = "パスワードが一致しません");
  if (name.length > 10 || name.length < 5)
    return (message.textContent =
      "ユーザー名は5文字以上10文字以内で入力してください");
  if (pass.length > 20)
    return (message.textContent = "パスワードは20文字以内で入力してください");
  const res = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name,
      pass: pass,
    }),
  });
  if (!res.ok) {
    const data = await res.text();
    message.textContent = data;
  } else {
    const token = await res.text();
    localStorage.setItem("token", token);
    location.href = "/";
  }
}
let isRegister = false;
const lfrom = document.getElementById("lform");
const rform = document.getElementById("rform");
const submit = document.getElementById("button");
rform.classList.add("hide");
function openLR() {
  isRegister
    ? ((isRegister = false),
      lfrom.classList.add("visi"),
      lfrom.classList.remove("hide"),
      rform.classList.add("hide"),
      rform.classList.remove("visi"),
      (submit.textContent = "登録はこちらから"))
    : ((isRegister = true),
      lfrom.classList.add("hide"),
      lfrom.classList.remove("visi"),
      rform.classList.add("visi"),
      rform.classList.remove("hide"),
      (submit.textContent = "ログインはこちらから"));
}
