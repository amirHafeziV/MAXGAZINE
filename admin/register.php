<?php
// Invite-only registration. Reachable only with a valid admin invite token in
// the URL (register.php?t=<token>). A valid, unused token lets the visitor
// create an admin account, which is then logged straight in. The token is
// single-use — once redeemed the same link stops working.
require __DIR__ . '/lib.php';
mw_session_start();

$db = mw_db();

// Already signed in → nothing to do here.
if (!empty($_SESSION['mw_user'])) { header('Location: index.php'); exit; }

$token = trim($_GET['t'] ?? $_POST['t'] ?? '');
$valid = mw_invite_valid($db, $token);

if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));

$err = '';
if ($valid && $_SERVER['REQUEST_METHOD'] === 'POST') {
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
    try {
      mw_redeem_invite($db, $token, $u, $p);
      session_regenerate_id(true);
      $_SESSION['mw_user'] = $u;
      header('Location: index.php');
      exit;
    } catch (Throwable $e) {
      // Most likely the username is already taken (UNIQUE constraint); the
      // invite is left unspent because the transaction rolled back.
      $err = 'That username is taken — pick another.';
    }
  }
}
?>
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Register — MasterWriter</title>
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="admin.css">
</head>
<body>
<section class="login-wrap">
<?php if (!$valid): ?>
  <div class="login-box">
    <div class="wordmark">MasterWriter<span class="dot">.</span></div>
    <p class="mono sub">INVITE LINK</p>
    <p class="err mono">This invite link is invalid or has already been used.</p>
    <p class="hint">Ask the site owner for a fresh invite, or
    <a href="login.php">sign in</a> if you already have an account.</p>
  </div>
<?php else: ?>
  <form class="login-box" method="post" action="register.php">
    <div class="wordmark">MasterWriter<span class="dot">.</span></div>
    <p class="mono sub">CREATE YOUR ADMIN ACCOUNT</p>
    <input type="hidden" name="csrf" value="<?= htmlspecialchars($_SESSION['csrf']) ?>">
    <input type="hidden" name="t" value="<?= htmlspecialchars($token) ?>">
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
    <p class="hint">This invite works once. After signing up you'll connect the
    panel to GitHub with your personal access token.</p>
  </form>
<?php endif; ?>
</section>
</body>
</html>
