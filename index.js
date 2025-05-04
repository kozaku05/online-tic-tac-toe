const http = require("http");
const express = require("express");
const websocket = require("ws");
const mysql = require("mysql2/promise");
const app = express();
const { v4: uuidv4 } = require("uuid");
const server = http.createServer(app);
const wss = new websocket.Server({ server });
const bcrypt = require("bcrypt");
app.use(express.static("./public"));
app.use(express.json());
let client;
let port = 3000;
(async () => {
  client = await mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "root",
    database: "TicTacToe",
  });
  server.listen(port);
})();
//ログイン エラーハンドリング済み
app.post("/login", async (req, res) => {
  try {
    const body = req.body;
    const name = body.name;
    const pass = body.pass;
    const [data] = await client.execute(
      "SELECT name,pass,token FROM users where name =(?)",
      [name]
    );
    if (data.length > 0) {
      const hashedpass = data[0].pass;
      const result = await bcrypt.compare(pass, hashedpass);
      if (result) {
        return res.status(200).send(data[0].token);
      } else {
        return res.status(400).send("ログイン情報が違います");
      }
    }
    return res.status(400).send("ログイン情報が違います");
  } catch (e) {
    return res.status(500).send("サーバーエラー");
  }
});
//ユーザー登録　エラーハンドリング済み
app.post("/register", async (req, res) => {
  try {
    const body = req.body;
    const name = body.name;
    const pass = body.pass;
    if (!name.trim() || !pass.trim())
      return res.status(400).send("すべて入力してください");
    if (name.length > 10 || name.length < 5)
      return res
        .status(400)
        .send("ユーザー名は5文字以上10文字以内で入力してください");
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
    const hashed = await bcrypt.hash(pass, 10);
    await client.query(
      "INSERT INTO users (name, pass, token) VALUES (?, ?, ?)",
      [name, hashed, token]
    );
    return res.status(200).send(token);
  } catch (e) {
    return res.status(500).send("サーバーエラー");
  }
});
//ユーザーデータ返す エラーハンドリング済み
app.post("/getdata", async (req, res) => {
  try {
    const token = req.body.token;
    const [data] = await client.execute("select * from users where token=(?)", [
      token,
    ]);
    if (data.length > 0) {
      res.status(200).send(JSON.stringify(data[0]));
    } else {
      res.status(400).send("正しくないTOKEN");
    }
  } catch (e) {
    res.status(500).send("サーバーエラー");
  }
});
//battle
const battles = new Map();
let waiting = null;
wss.on("connection", (ws) => {
  try {
    ws.on("message", async (message) => {
      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "不正なデータの送信を検知しました",
          })
        );
        return;
      }
      if (data.type === "battle") {
        const token = data.token;
        const [user] = await client.execute(
          "select * from users where token=(?)",
          [token]
        );
        if (user.length > 0) {
          ws.user = user[0];
          ws.send(JSON.stringify({ type: "info", message: "マッチング開始" }));
          let userdata = [ws, token];
          if (waiting) {
            const opponent = waiting;
            waiting = null;
            let inUnique = false;
            let gameId;
            while (!inUnique) {
              gameId = uuidv4();
              if (!battles.has(gameId)) inUnique = true;
            }
            const player1 = opponent[0];
            const player2 = ws;
            //自分と対戦不可にする
            if (opponent[1] === token) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "自分と対戦することはできません",
                })
              );
              opponent[0].send(
                JSON.stringify({
                  type: "error",
                  message: "自分と対戦することはできません",
                })
              );
              ws.close();
              return;
            }
            const [name1] = await client.execute(
              "select name from users where token=(?)",
              [opponent[1]]
            );
            const [name2] = await client.execute(
              "select name from users where token=(?)",
              [token]
            );
            let gameData = {
              players: [player1, player2],
              gameId: gameId,
              board: [
                [0, 0, 0],
                [0, 0, 0],
                [0, 0, 0],
              ],
              turn: player1,
              turnShape: "O",
              timeout: null,
            };
            player1.send(
              JSON.stringify({
                type: "start",
                gameId: gameId,
                names: [name1[0].name, name2[0].name],
                shape: "O",
              })
            );
            player2.send(
              JSON.stringify({
                type: "start",
                gameId: gameId,
                names: [name1[0].name, name2[0].name],
                shape: "X",
              })
            );
            gameData.timeout = setTimeout(() => {
              if (battles.has(gameId)) {
                player1.send(
                  JSON.stringify({
                    type: "timeout",
                    turnShape: gameData.turnShape,
                  })
                );
                player2.send(
                  JSON.stringify({
                    type: "timeout",
                    turnShape: gameData.turnShape,
                  })
                );
                timeout(token, opponent[1]);
                battles.delete(gameId);
                return;
              }
            }, 15000);
            gameData.tokens = [opponent[1], token];
            battles.set(gameId, gameData);
          } else {
            //マッチング待機
            waiting = userdata;
            ws.send(JSON.stringify({ type: "waiting" }));
          }
        } else {
          //正しくないTOKEN
          ws.send(
            JSON.stringify({ type: "error", message: "正しくないTOKEN" })
          );
          ws.close();
          return;
        }
      }
      if (data.type === "move") {
        const gameId = data.gameId;
        if (battles.has(gameId)) {
          const gameData = battles.get(gameId);
          const player1 = gameData.players[0];
          const player2 = gameData.players[1];
          const token1 = gameData.tokens[0];
          const token2 = gameData.tokens[1];
          const board = gameData.board;
          const turn = gameData.turn;
          if (ws === turn) {
            const x = data.x;
            const y = data.y;
            const shape = data.shape;
            if (
              typeof x !== "number" ||
              typeof y !== "number" ||
              x < 0 ||
              x > 2 ||
              y < 0 ||
              y > 2
            ) {
              ws.send(
                JSON.stringify({ type: "gameError", message: "不正な座標です" })
              );
              return;
            }
            if (shape !== "O" && shape !== "X") {
              ws.send(
                JSON.stringify({
                  type: "gameError",
                  message: "不正なシンボルです",
                })
              );
              return;
            }
            if (board[y][x] === 0) {
              board[y][x] = turn === player1 ? "O" : "X";
              turn === player1
                ? (gameData.turn = player2)
                : (gameData.turn = player1);
              player1.send(
                JSON.stringify({ type: "move", x: x, y: y, shape: shape })
              );
              player2.send(
                JSON.stringify({ type: "move", x: x, y: y, shape: shape })
              );
              //winner判定
              function checkWinner() {
                for (let i = 0; i < 3; i++) {
                  //横の判定
                  if (
                    board[i][0] === "O" &&
                    board[i][1] === "O" &&
                    board[i][2] === "O"
                  ) {
                    player1.send(JSON.stringify({ type: "winner" }));
                    player2.send(JSON.stringify({ type: "loser" }));
                    pmPoint(token1, token2);
                    battles.delete(gameId);
                    return true;
                  } else if (
                    board[i][0] === "X" &&
                    board[i][1] === "X" &&
                    board[i][2] === "X"
                  ) {
                    player1.send(JSON.stringify({ type: "loser" }));
                    player2.send(JSON.stringify({ type: "winner" }));
                    pmPoint(token2, token1);
                    battles.delete(gameId);
                    return true;
                  }
                }
                for (let i = 0; i < 3; i++) {
                  //縦の判定
                  if (
                    board[0][i] === "O" &&
                    board[1][i] === "O" &&
                    board[2][i] === "O"
                  ) {
                    player1.send(JSON.stringify({ type: "winner" }));
                    player2.send(JSON.stringify({ type: "loser" }));
                    pmPoint(token1, token2);
                    battles.delete(gameId);
                    return true;
                  } else if (
                    board[0][i] === "X" &&
                    board[1][i] === "X" &&
                    board[2][i] === "X"
                  ) {
                    player1.send(JSON.stringify({ type: "loser" }));
                    player2.send(JSON.stringify({ type: "winner" }));
                    pmPoint(token2, token1);
                    battles.delete(gameId);
                    return true;
                  }
                }
                //斜めの判定左上から右下
                if (
                  board[0][0] === "O" &&
                  board[1][1] === "O" &&
                  board[2][2] === "O"
                ) {
                  player1.send(JSON.stringify({ type: "winner" }));
                  player2.send(JSON.stringify({ type: "loser" }));
                  pmPoint(token1, token2);
                  battles.delete(gameId);
                  return true;
                } else if (
                  board[0][0] === "X" &&
                  board[1][1] === "X" &&
                  board[2][2] === "X"
                ) {
                  player1.send(JSON.stringify({ type: "loser" }));
                  player2.send(JSON.stringify({ type: "winner" }));
                  pmPoint(token2, token1);
                  battles.delete(gameId);
                  return true;
                }
                //斜めの判定右上から左下
                if (
                  board[0][2] === "O" &&
                  board[1][1] === "O" &&
                  board[2][0] === "O"
                ) {
                  player1.send(JSON.stringify({ type: "winner" }));
                  player2.send(JSON.stringify({ type: "loser" }));
                  pmPoint(token1, token2);
                  battles.delete(gameId);
                  return true;
                } else if (
                  board[0][2] === "X" &&
                  board[1][1] === "X" &&
                  board[2][0] === "X"
                ) {
                  player1.send(JSON.stringify({ type: "loser" }));
                  player2.send(JSON.stringify({ type: "winner" }));
                  pmPoint(token2, token1);
                  battles.delete(gameId);
                  return true;
                }
              }
              if (checkWinner()) {
                return;
              }
              //引き分けの判定
              const isDraw = board.flat().every((cell) => cell !== 0);
              if (isDraw) {
                player1.send(JSON.stringify({ type: "draw" }));
                player2.send(JSON.stringify({ type: "draw" }));
                draw(token1, token2);
                battles.delete(gameId);
                return true;
              }
              gameData.turnShape = turn === player1 ? "X" : "O";
              unTimeout(gameData);
              let nextTimeout;
              let notimeout;
              gameData.turn === player1
                ? ((nextTimeout = token2), (notimeout = token1))
                : ((nextTimeout = token1), (notimeout = token2));
              createTimeout(nextTimeout, notimeout, gameData);
            } else {
              ws.send(
                JSON.stringify({
                  type: "gameError",
                  message: "そのマスはすでに埋まっています",
                })
              );
            }
          } else {
            ws.send(
              JSON.stringify({
                type: "gameError",
                message: "あなたのターンではありません",
              })
            );
          }
        }
      }
    });
    ws.on("close", () => {
      if (waiting && waiting[0] === ws) {
        waiting = null;
      }
    });
  } catch (e) {
    console.log(e);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "サーバーエラー",
      })
    );
  }
});
//勝利時のポイント増減 win=+100 lose=-50 draw=+50
async function pmPoint(winnerToken, loserToken) {
  await client.execute("UPDATE users SET win = win + 1 WHERE token = ?", [
    winnerToken,
  ]);
  await client.execute("UPDATE users SET lose = lose + 1 WHERE token = ?", [
    loserToken,
  ]);
  let [winnerRP] = await client.execute(
    "SELECT RP FROM users WHERE token = ?",
    [winnerToken]
  );
  let [loserRP] = await client.execute("SELECT RP FROM users WHERE token = ?", [
    loserToken,
  ]);
  winnerRP = parseInt(winnerRP[0].RP) + 100;
  loserRP = parseInt(loserRP[0].RP) - 50;
  if (loserRP < 0) loserRP = 0;
  await client.execute("UPDATE users SET RP = ? WHERE token = ?", [
    winnerRP,
    winnerToken,
  ]);
  await client.execute("UPDATE users SET RP = ? WHERE token = ?", [
    loserRP,
    loserToken,
  ]);
}
//引き分け時
async function draw(token1, token2) {
  await client.execute("UPDATE users SET draw = draw + 1 WHERE token = ?", [
    token1,
  ]);
  await client.execute("UPDATE users SET draw = draw + 1 WHERE token = ?", [
    token2,
  ]);
  let [user1] = await client.execute("SELECT RP FROM users WHERE token = ?", [
    token1,
  ]);
  let [user2] = await client.execute("SELECT RP FROM users WHERE token = ?", [
    token2,
  ]);
  user1 = parseInt(user1[0].RP) + 50;
  user2 = parseInt(user2[0].RP) + 50;
  await client.execute("UPDATE users SET RP = ? WHERE token = ?", [
    user1,
    token1,
  ]);
  await client.execute("UPDATE users SET RP = ? WHERE token = ?", [
    user2,
    token2,
  ]);
}
//タイムアウト作成
function createTimeout(turnToken, noTurnToken, gameData) {
  gameData.timeout = setTimeout(() => {
    if (battles.has(gameData.gameId)) {
      gameData.players[0].send(
        JSON.stringify({
          type: "timeout",
          turnShape: gameData.turnShape,
        })
      );
      gameData.players[1].send(
        JSON.stringify({
          type: "timeout",
          turnShape: gameData.turnShape,
        })
      );
      timeout(noTurnToken, turnToken);
      battles.delete(gameData.gameId);
      return;
    }
  }, 15000);
}
//タイムアウト解除
function unTimeout(gameData) {
  if (gameData.timeout) {
    clearTimeout(gameData.timeout);
    gameData.timeout = null;
  }
}
//タイムアウト時の処理 timeoutUser=-50 notimeoutUser=+50
async function timeout(token, timeoutToken) {
  let [timeoutRP] = await client.execute(
    "SELECT RP FROM users WHERE token = ?",
    [timeoutToken]
  );
  let [noTimeoutRP] = await client.execute(
    "SELECT RP FROM users WHERE token = ?",
    [token]
  );
  timeoutRP = parseInt(timeoutRP[0].RP) - 100;
  noTimeoutRP = parseInt(noTimeoutRP[0].RP) + 50;
  if (timeoutRP < 0) timeoutRP = 0;
  await client.execute("UPDATE users SET RP = ? WHERE token = ?", [
    noTimeoutRP,
    token,
  ]);
  await client.execute("UPDATE users SET RP = ? WHERE token = ?", [
    timeoutRP,
    timeoutToken,
  ]);
}
