<?php
// Shared auth helpers for the MasterWriter panel gate.
// Users live in an SQLite file outside direct web reach (denied via .htaccess);
// passwords are stored as bcrypt hashes, never plaintext.

const MW_DB_DIR  = __DIR__ . '/data';
const MW_DB_PATH = MW_DB_DIR . '/mw-users.sqlite';

// Admin invite links. Each entry is the SHA-256 of a secret token; the raw
// token travels in the registration URL (register.php?t=<token>) and is never
// stored here, so a leaked source tree can't be turned back into a usable link.
// Each token works exactly once — after a successful sign-up it's burned in the
// `used_invites` table. To mint a new link: generate a token, drop its sha256
// here, and hand out register.php?t=<token>.
const MW_ADMIN_INVITES = [
  '6433cd8c0cd087bd830dea57a8fc8da63d99191284739406266f26e143791b8b',
  'b8877108c487c4db2275def50dfdc90953d9b47a6c9949a6493d8912e3108fa6',
  '335456fd76879f7a20c8c1735338a501be0d5f014fa547621139ccf929b1e081',
];

function mw_db(): PDO {
  if (!extension_loaded('pdo_sqlite')) {
    http_response_code(500);
    exit('Server is missing the PHP SQLite extension (pdo_sqlite). '
       . 'Enable it in cPanel → Select PHP Version → Extensions, then reload.');
  }
  if (!is_dir(MW_DB_DIR)) mkdir(MW_DB_DIR, 0750, true);
  $db = new PDO('sqlite:' . MW_DB_PATH);
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec('CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT \'writer\',
    created_at TEXT NOT NULL DEFAULT (datetime(\'now\'))
  )');
  // Older databases predate the role column — add it if missing.
  $cols = $db->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_COLUMN, 1);
  if (!in_array('role', $cols, true)) {
    $db->exec('ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT \'writer\'');
  }
  $db->exec('CREATE TABLE IF NOT EXISTS login_attempts(
    ip TEXT NOT NULL,
    at INTEGER NOT NULL
  )');
  // Burned invite tokens (stored as sha256, same form as MW_ADMIN_INVITES).
  $db->exec('CREATE TABLE IF NOT EXISTS used_invites(
    token_hash TEXT PRIMARY KEY,
    username   TEXT NOT NULL,
    used_at    TEXT NOT NULL DEFAULT (datetime(\'now\'))
  )');
  return $db;
}

// True only if the raw token matches a configured admin invite AND hasn't
// been spent yet.
function mw_invite_valid(PDO $db, string $token): bool {
  if ($token === '') return false;
  $hash = hash('sha256', $token);
  $known = false;
  foreach (MW_ADMIN_INVITES as $h) if (hash_equals($h, $hash)) $known = true;
  if (!$known) return false;
  $st = $db->prepare('SELECT 1 FROM used_invites WHERE token_hash = ?');
  $st->execute([$hash]);
  return $st->fetchColumn() === false;
}

// Consume an invite: create the admin user and burn the token in one
// transaction, so a token can never mint two accounts.
function mw_redeem_invite(PDO $db, string $token, string $username, string $password): void {
  $hash = hash('sha256', $token);
  $db->beginTransaction();
  try {
    $st = $db->prepare('INSERT INTO users(username, pass_hash, role) VALUES(?, ?, \'admin\')');
    $st->execute([$username, password_hash($password, PASSWORD_BCRYPT)]);
    $db->prepare('INSERT INTO used_invites(token_hash, username) VALUES(?, ?)')
       ->execute([$hash, $username]);
    $db->commit();
  } catch (Throwable $e) {
    $db->rollBack();
    throw $e;
  }
}

function mw_user_count(PDO $db): int {
  return (int)$db->query('SELECT COUNT(*) FROM users')->fetchColumn();
}

function mw_add_user(PDO $db, string $username, string $password): void {
  $st = $db->prepare('INSERT INTO users(username, pass_hash) VALUES(?, ?)');
  $st->execute([$username, password_hash($password, PASSWORD_BCRYPT)]);
}

// 10 failed attempts per IP per 10 minutes.
function mw_throttled(PDO $db, string $ip): bool {
  $db->prepare('DELETE FROM login_attempts WHERE at < ?')->execute([time() - 600]);
  $st = $db->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ?');
  $st->execute([$ip]);
  return (int)$st->fetchColumn() >= 10;
}

function mw_record_failure(PDO $db, string $ip): void {
  $db->prepare('INSERT INTO login_attempts(ip, at) VALUES(?, ?)')->execute([$ip, time()]);
}

function mw_verify(PDO $db, string $username, string $password): bool {
  $st = $db->prepare('SELECT pass_hash FROM users WHERE username = ?');
  $st->execute([$username]);
  $hash = $st->fetchColumn();
  // Verify against a dummy hash when the user doesn't exist, so response
  // timing doesn't reveal which usernames are valid.
  return password_verify($password, $hash ?: '$2y$10$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG');
}

function mw_session_start(): void {
  session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => !empty($_SERVER['HTTPS']),
    'httponly' => true,
    'samesite' => 'Strict',
  ]);
  session_name('mwsess');
  session_start();
}
