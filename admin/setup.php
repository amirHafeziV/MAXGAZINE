<?php
// First-run setup: creates the initial user. Refuses to run once any user
// exists — manage further users with users.php (CLI) afterwards.
require __DIR__ . '/lib.php';
mw_session_start();

$db = mw_db();
if (mw_user_count($db) > 0) { header('Location: login.php'); exit; }

if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));

$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $u = trim($_POST['username'] ?? '');
  $p = $_POST['password'] ?? '';
  if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '')) {
    $err = 'Session expired — try again.';
  } elseif (!preg_match('/^[A-Za-z0-9._-]{3,32}$/', $u)) {
    $err = 'Username: 3–32 chars, letters/digits/._- only.';
  } elseif (strlen($p) < 10) {
    $err = 'Password must be at least 10 characters.';
  } elseif ($p !== ($_POST['password2'] ?? '')) {
    $err = 'Passwords do not match.';
  } else {
    mw_add_user($db, $u, $p);
    session_regenerate_id(true);
    $_SESSION['mw_user'] = $u;
    header('Location: index.php');
    exit;
  }
}
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Setup — MasterWriter</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="admin.css">
</head>
<body>
<section class="login-wrap">
  <form class="login-box" method="post" action="setup.php">
    <div class="wordmark">MasterWriter<span class="dot">.</span></div>
    <p class="mono sub">FIRST-RUN SETUP — CREATE OWNER ACCOUNT</p>
    <input type="hidden" name="csrf" value="<?= htmlspecialchars($_SESSION['csrf']) ?>">
    <label>Username
      <input name="username" autocomplete="username" required autofocus>
    </label>
    <label>Password (min 10 chars)
      <input type="password" name="password" autocomplete="new-password" required>
    </label>
    <label>Repeat password
      <input type="password" name="password2" autocomplete="new-password" required>
    </label>
    <button class="btn" type="submit">Create account →</button>
    <p class="err mono"><?= htmlspecialchars($err) ?></p>
    <p class="hint">This page only works while no account exists. Add more writers
    later with <b>users.php</b> from the cPanel terminal.</p>
  </form>
</section>
</body>
</html>
