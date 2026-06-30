<?php
// Panel-only image proxy for assets/uploads/*.
//
// Why this exists: a freshly uploaded banner is committed to the repo
// immediately, but it does NOT appear at https://maxgazine.com/assets/uploads/…
// until the build + FTP deploy finishes (~2-4 min). The panel used to preview
// covers straight from the live origin, so right after publishing the image
// 404'd and looked "not saved" until the deploy caught up — the recurring
// "sometimes a refresh fixes it, sometimes not" bug. GitHub has the bytes the
// instant the upload commit lands, so we serve previews from there through the
// server-side token instead.

require __DIR__ . '/guard.php';

if (!file_exists(__DIR__ . '/config.php')) {
  http_response_code(500);
  exit('config.php missing');
}
require __DIR__ . '/config.php';

// Only allow the uploads folder — no traversal (..) and no nested paths.
$p = (string)($_GET['p'] ?? '');
if (!preg_match('#^assets/uploads/[^/]+$#u', $p) || str_contains($p, '..')) {
  http_response_code(400);
  exit('bad path');
}

$url = 'https://api.github.com/repos/' . MW_GH_OWNER . '/' . MW_GH_REPO
     . '/contents/' . $p . '?ref=' . rawurlencode(MW_GH_BRANCH);

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT        => 30,
  CURLOPT_HTTPHEADER     => [
    'Authorization: Bearer ' . MW_GH_TOKEN,
    // raw media type → GitHub streams the file bytes directly, no base64 wrap.
    'Accept: application/vnd.github.raw',
    'X-GitHub-Api-Version: 2022-11-28',
    'User-Agent: MAXGAZINE-MasterWriter-Panel',
  ],
]);
$bytes  = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($bytes === false || $status >= 400) {
  http_response_code($status >= 400 ? $status : 502);
  exit('upstream error');
}

// Derive a content type from the extension.
$ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
$types = [
  'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
  'gif' => 'image/gif',  'webp' => 'image/webp', 'svg' => 'image/svg+xml',
  'avif' => 'image/avif', 'mp4' => 'video/mp4', 'mov' => 'video/quicktime',
];
header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
// Short cache: a slug can be re-uploaded under a new name, but the same name is
// effectively immutable, so a few minutes is safe and keeps the editor snappy.
header('Cache-Control: private, max-age=300');
echo $bytes;
