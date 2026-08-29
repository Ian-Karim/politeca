<?php
include 'config.php';
session_start();

// Establecer headers primero
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar que es una solicitud POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('error' => 'Método no permitido'));
    exit;
}

// Obtener datos del cuerpo de la solicitud
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(array('error' => 'JSON inválido'));
    exit;
}

$funcion_id = isset($data['funcion_id']) ? $data['funcion_id'] : null;
$asiento_id = isset($data['asiento_id']) ? $data['asiento_id'] : null;

if (!$funcion_id || !$asiento_id) {
    http_response_code(400);
    echo json_encode(array('error' => 'Datos incompletos'));
    exit;
}

try {
    // Eliminar bloqueos expirados primero
    $pdo->prepare('DELETE FROM asientos_bloqueados WHERE expiracion <= NOW()')->execute();
    
    // Verificar si el asiento ya está reservado
    $stmt = $pdo->prepare('
        SELECT * FROM asientos_reservados 
        WHERE funcion_id = :funcion_id AND asiento_id = :asiento_id
    ');
    $stmt->execute(array('funcion_id' => $funcion_id, 'asiento_id' => $asiento_id));
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(array('success' => false, 'message' => 'Asiento ya está ocupado'));
        exit;
    }
    
    // Verificar si el asiento ya está bloqueado
    $stmt = $pdo->prepare('
        SELECT * FROM asientos_bloqueados 
        WHERE funcion_id = :funcion_id AND asiento_id = :asiento_id AND expiracion > NOW()
    ');
    $stmt->execute(array('funcion_id' => $funcion_id, 'asiento_id' => $asiento_id));
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(array('success' => false, 'message' => 'Asiento ya está bloqueado'));
        exit;
    }
    
    // Bloquear el asiento por 5 minutos
    $stmt = $pdo->prepare('
        INSERT INTO asientos_bloqueados (funcion_id, asiento_id, session_id, expiracion)
        VALUES (:funcion_id, :asiento_id, :session_id, DATE_ADD(NOW(), INTERVAL 5 MINUTE))
    ');
    
    $session_id = session_id();
    
    $stmt->execute(array(
        'funcion_id' => $funcion_id,
        'asiento_id' => $asiento_id,
        'session_id' => $session_id
    ));
    
    echo json_encode(array('success' => true));
    
} catch (PDOException $e) {
    error_log('Error en bloquear_asiento.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(array('error' => 'Error interno del servidor: ' . $e->getMessage()));
} catch (Exception $e) {
    error_log('Error general en bloquear_asiento.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(array('error' => 'Error interno del servidor'));
}
?>