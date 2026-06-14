<?php
require __DIR__ . '/lib.php';
mw_session_start();

$db = mw_db();

// No users yet → send to first-run setup.
if (mw_user_count($db) === 0) { header('Location: setup.php'); exit; }

if (!empty($_SESSION['mw_user'])) { header('Location: index.php'); exit; }

if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));

$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  if (!hash_equals($_SESSION['csrf'], $_POST['csrf'] ?? '')) {
    $err = 'Session expired — try again.';
  } elseif (mw_throttled($db, $ip)) {
    $err = 'Too many attempts. Wait 10 minutes.';
  } elseif (mw_verify($db, trim($_POST['username'] ?? ''), $_POST['password'] ?? '')) {
    session_regenerate_id(true);
    $_SESSION['mw_user'] = trim($_POST['username']);
    header('Location: index.php');
    exit;
  } else {
    mw_record_failure($db, $ip);
    $err = 'Wrong username or password.';
  }
}
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sign in — MasterWriter</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="admin.css">
</head>
<body>
<section class="login-wrap">
  <form class="login-box" method="post" action="login.php">
    <div class="wordmark">MasterWriter<span class="dot">.</span></div>
    <p class="mono sub">MAXGAZINE PUBLISHING PANEL</p>
    <input type="hidden" name="csrf" value="<?= htmlspecialchars($_SESSION['csrf']) ?>">
    <label>Username
      <input name="username" autocomplete="username" required autofocus>
    </label>
    <label>Password
      <input type="password" name="password" autocomplete="current-password" required>
    </label>
    <button class="btn" type="submit">Sign in →</button>
    <p class="err mono"><?= htmlspecialchars($err) ?></p>
    <p class="hint">Writer access only. After signing in you'll still connect the panel
    to GitHub with your personal access token.</p>
  </form>
</section>
</body>
</html>
