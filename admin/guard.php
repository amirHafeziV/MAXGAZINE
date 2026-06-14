<?php
require __DIR__ . '/lib.php';
mw_session_start();
if (empty($_SESSION['mw_user'])) {
  header('Location: login.php');
  exit;
}
