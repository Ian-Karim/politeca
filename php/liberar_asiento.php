<?php
include 'config.php';
session_start();

$data = json_decode(file_get_contents('php://input'), true);
$funcion_id = $data['funcion_id'] ?? null;
$asiento_id = $data['asiento_id'] ?? null;
$liberar_todos = $data['liberar_todos'] ?? false;
$session_id = session_id();

try {
    if ($liberar_todos) {
        // Liberar todos los asientos de esta sesión
        $stmt = $pdo->prepare('DELETE FROM asientos_bloqueados WHERE session_id = :session_id');
        $stmt->execute(['session_id' => $session_id]);
    } else if ($funcion_id && $asiento_id) {
        // Liberar un asiento específico
        $stmt = $pdo->prepare('
            DELETE FROM asientos_bloqueados 
            WHERE funcion_id = :funcion_id AND asiento_id = :asiento_id AND session_id = :session_id
        ');
        $stmt->execute([
            'funcion_id' => $funcion_id,
            'asiento_id' => $asiento_id,
            'session_id' => $session_id
        ]);
    }
    
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al liberar el asiento: ' . $e->getMessage()]);
}
?>