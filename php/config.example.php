<?php
// config.example.php
// Copia este archivo como config.php y coloca tus propias credenciales locales.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$host = 'localhost';
$dbname = 'cinemadb';
$username = 'tu_usuario_aqui';
$password = 'tu_password_aqui';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
} catch (PDOException $e) {
    error_log("Could not connect to the database $dbname: " . $e->getMessage());
    die();
}
?>
