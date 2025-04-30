const http = require("http");
const express = require("express");
const websocket = require("ws");
const mysql = require("mysql2/promise");
const app = express();
const server = http.createServer(app);
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
server.listen(3000);
app.use(express.static("./public"));
app.use(express.json());
let client;
(async () => {
  client = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "TicTacToe",
  });
})();
//ユーザー登録
app.post("/register", async (req, res) => {
  const body = req.body;
  const name = body.name;
  let pass = body.pass;
  if (name === "" || pass === "")
    return res.status(400).send("すべて入力してください");
  if (name.length > 10 || name.length < 5)
    return res
      .status(400)
      .send("ユーザー名は10文字以上5文字以内で入力してください");
  if (pass.length > 20)
    return res.status(400).send("パスワードは20文字以内で入力してください");
  const [data] = await client.execute(
    "SELECT name FROM users where name =(?)",
    [name]
  );
  if (data.length > 0) return res.status(400).send("重複するユーザーネーム");

  let inUnique = false;
  let token;
  while (!inUnique) {
    token = uuidv4();
    const [data1] = await client.execute(
      "SELECT token FROM users where token =(?)",
      [token]
    );
    if (data1.length === 0) inUnique = true;
  }
  const hashed = bcrypt.hashSync(pass, 10);
  await client.query("INSERT INTO users (name, pass, token) VALUES (?, ?, ?)", [
    name,
    hashed,
    token,
  ]);
  res.status(200).send(token);
});
app.post("/login", async (req, res) => {});
