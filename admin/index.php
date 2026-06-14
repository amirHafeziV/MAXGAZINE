<?php
require __DIR__ . '/guard.php';
header('Content-Type: text/html; charset=UTF-8');
readfile(__DIR__ . '/app.html');
