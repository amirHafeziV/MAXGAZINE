<?php
// Throwaway diagnostic — open this first if the panel "doesn't come up".
// If you see this page rendered, PHP itself is running. Delete this file once
// the panel works (it reveals nothing secret, but it's clutter).
header('Content-Type: text/plain; charset=UTF-8');

$dataDir = __DIR__ . '/data';
echo "MasterWriter health check\n";
echo "=========================\n";
echo "PHP version       : " . PHP_VERSION . (PHP_VERSION_ID >= 70300 ? "  OK" : "  TOO OLD (need 7.3+)") . "\n";
echo "pdo_sqlite loaded : " . (extension_loaded('pdo_sqlite') ? "yes  OK" : "NO  <-- enable in cPanel > Select PHP Version > Extensions") . "\n";
echo "HTTPS             : " . (!empty($_SERVER['HTTPS']) ? "yes" : "no (sessions still work, but use https in production)") . "\n";
echo "data/ exists      : " . (is_dir($dataDir) ? "yes" : "no (will be auto-created on first use)") . "\n";
echo "data/ writable    : " . ((is_dir($dataDir) ? is_writable($dataDir) : is_writable(__DIR__)) ? "yes  OK" : "NO  <-- fix folder permissions") . "\n";
echo "doc root          : " . ($_SERVER['DOCUMENT_ROOT'] ?? '?') . "\n";
echo "this file         : " . __FILE__ . "\n";
