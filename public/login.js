const message = document.getElementById("message");
async function login() {
  const name = document.getElementById("login-name").value;
  const pass = document.getElementById("login-pass").value;
  if (name === "" || pass === "") {
    return (message.textContent = "すべて入力してください");
  }
  const res = await fetch("/login", {
    method: "POST",
    headers: { "Content-type": "application/json" },
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
  if (name === "" || pass === "" || repass === "")
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
