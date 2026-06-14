<?php
// CLI user manager — run from the cPanel terminal (or any shell with PHP):
//   php users.php list
//   php users.php add <username>        (prompts for password)
//   php users.php passwd <username>     (prompts for new password)
//   php users.php del <username>
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require __DIR__ . '/lib.php';
$db = mw_db();

function read_password(string $prompt): string {
  fwrite(STDERR, $prompt);
  system('stty -echo');
  $p = rtrim(fgets(STDIN), "\n");
  system('stty echo');
  fwrite(STDERR, "\n");
  return $p;
}

[$cmd, $user] = [$argv[1] ?? 'list', $argv[2] ?? null];

switch ($cmd) {
  case 'list':
    foreach ($db->query('SELECT username, created_at FROM users ORDER BY id') as $r)
      echo "{$r['username']}\t{$r['created_at']}\n";
    break;

  case 'add':
    if (!$user) exit("Usage: php users.php add <username>\n");
    $p = read_password("Password for $user: ");
    if (strlen($p) < 10) exit("Password must be at least 10 characters.\n");
    mw_add_user($db, $user, $p);
    echo "Added $user.\n";
    break;

  case 'passwd':
    if (!$user) exit("Usage: php users.php passwd <username>\n");
    $p = read_password("New password for $user: ");
    if (strlen($p) < 10) exit("Password must be at least 10 characters.\n");
    $st = $db->prepare('UPDATE users SET pass_hash = ? WHERE username = ?');
    $st->execute([password_hash($p, PASSWORD_BCRYPT), $user]);
    echo $st->rowCount() ? "Updated $user.\n" : "No such user.\n";
    break;

  case 'del':
    if (!$user) exit("Usage: php users.php del <username>\n");
    $st = $db->prepare('DELETE FROM users WHERE username = ?');
    $st->execute([$user]);
    echo $st->rowCount() ? "Deleted $user.\n" : "No such user.\n";
    break;

  default:
    exit("Commands: list | add <user> | passwd <user> | del <user>\n");
}
