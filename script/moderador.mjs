// Promove (ou rebaixa) um usuário a moderador.
// Uso:  node script/moderador.mjs <username>
//       node script/moderador.mjs <username> --remover
import Database from "better-sqlite3";

const [username, flag] = process.argv.slice(2);
if (!username) {
  console.error("uso: node script/moderador.mjs <username> [--remover]");
  process.exit(1);
}

const db = new Database("data.db");
const cols = db.prepare("PRAGMA table_info(users)").all();
if (!cols.some((c) => c.name === "is_moderator")) {
  db.exec("ALTER TABLE users ADD COLUMN is_moderator INTEGER NOT NULL DEFAULT 0");
}

const value = flag === "--remover" ? 0 : 1;
const info = db.prepare("UPDATE users SET is_moderator = ? WHERE username = ?").run(value, username);
if (!info.changes) {
  console.error(`usuário não encontrado: ${username}`);
  process.exit(1);
}
console.log(`${username} agora ${value ? "é" : "não é mais"} moderador(a).`);
