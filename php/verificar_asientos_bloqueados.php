<?php
include 'config.php';

// Establecer headers primero
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar que es una solicitud GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array('error' => 'Método no permitido'));
    exit;
}

// Obtener el ID de la función de manera compatible con versiones anteriores de PHP
$funcion_id = isset($_GET['funcion_id']) ? $_GET['funcion_id'] : null;

if (!$funcion_id) {
    http_response_code(400);
    echo json_encode(array('error' => 'Se requiere el ID de la función'));
    exit;
}

try {
    // Eliminar bloqueos expirados
    $pdo->prepare('DELETE FROM asientos_bloqueados WHERE expiracion <= NOW()')->execute();
    
    // Obtener asientos bloqueados para esta función
    $stmt = $pdo->prepare('
        SELECT asiento_id FROM asientos_bloqueados 
        WHERE funcion_id = :funcion_id AND expiracion > NOW()
    ');
    $stmt->execute(array('funcion_id' => $funcion_id));
    $asientos_bloqueados = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Convertir a números enteros
    $asientos_bloqueados = array_map('intval', $asientos_bloqueados);
    
    echo json_encode($asientos_bloqueados);
    
} catch (PDOException $e) {
    error_log('Error en verificar_asientos_bloqueados.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(array('error' => 'Error al verificar asientos bloqueados: ' . $e->getMessage()));
} catch (Exception $e) {
    error_log('Error general en verificar_asientos_bloqueados.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(array('error' => 'Error interno del servidor'));
}
?>