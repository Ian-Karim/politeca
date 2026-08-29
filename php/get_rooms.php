<?php
include 'config.php';

try {
    $stmt = $pdo->query('SELECT * FROM salas ORDER BY nombre');
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    header('Content-Type: application/json');
    echo json_encode($rooms);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al obtener las salas: ' . $e->getMessage()]);
}
?>