<?php
require __DIR__ . '/lib.php';
mw_session_start();
$_SESSION = [];
session_destroy();
header('Location: login.php');
