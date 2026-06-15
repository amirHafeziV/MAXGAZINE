<?php
// JSON proxy between the panel SPA and the GitHub Contents/Actions API.
// Every signed-in session publishes through the single server-side token in
// config.php — writers never see or enter a GitHub token.

require __DIR__ . '/guard.php';

if (!file_exists(__DIR__ . '/config.php')) {
  http_response_code(500);
  header('Content-Type: application/json; charset=UTF-8');
  echo json_encode(['error' => 'admin/config.php is missing — copy config.example.php and add a GitHub token.']);
  exit;
}
require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=UTF-8');

// Tells the SPA which repo/branch it's working against and who's signed in.
// No token is ever sent to the browser.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'config') {
  echo json_encode([
    'owner'  => MW_GH_OWNER,
    'repo'   => MW_GH_REPO,
    'branch' => MW_GH_BRANCH,
    'origin' => MW_SITE_ORIGIN,
    'user'   => $_SESSION['mw_user'],
  ]);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'POST required']);
  exit;
}

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$method = strtoupper($in['method'] ?? 'GET');
$path = (string)($in['path'] ?? '');
$body = $in['body'] ?? null;

// Only allow calls into this panel's own repo — prevents the proxy being
// used as an open relay to the rest of the GitHub API.
$prefix = '/repos/' . MW_GH_OWNER . '/' . MW_GH_REPO . '/';
if (strpos($path, $prefix) !== 0 || !in_array($method, ['GET', 'PUT', 'DELETE', 'POST'], true)) {
  http_response_code(400);
  echo json_encode(['error' => 'invalid request']);
  exit;
}

$headers = [
  'Authorization: Bearer ' . MW_GH_TOKEN,
  'Accept: application/vnd.github+json',
  'X-GitHub-Api-Version: 2022-11-28',
  'User-Agent: MAXGAZINE-MasterWriter-Panel',
];
$opts = [
  CURLOPT_CUSTOMREQUEST  => $method,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT        => 30,
];
if ($body !== null) {
  $headers[] = 'Content-Type: application/json';
  $opts[CURLOPT_POSTFIELDS] = json_encode($body);
}
$opts[CURLOPT_HTTPHEADER] = $headers;

$ch = curl_init('https://api.github.com' . $path);
curl_setopt_array($ch, $opts);
$resp = curl_exec($ch);
if ($resp === false) {
  $err = curl_error($ch);
  http_response_code(502);
  echo json_encode(['error' => $err]);
  exit;
}
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);

echo json_encode(['status' => $status, 'body' => json_decode($resp, true)]);
