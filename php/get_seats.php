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
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$function_id = $_GET['function_id'] ?? null;

if (!$function_id || !is_numeric($function_id)) {
    http_response_code(400);
    echo json_encode(['error' => 'Se requiere un ID de función válido']);
    exit;
}

try {
    // Obtener información de la sala para esta función
    $stmt = $pdo->prepare('
        SELECT s.id as sala_id, s.nombre as sala_nombre, s.capacidad 
        FROM funciones f 
        JOIN salas s ON f.sala_id = s.id 
        WHERE f.id = :function_id
    ');
    $stmt->execute(['function_id' => $function_id]);
    $sala = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$sala) {
        echo json_encode(['error' => 'Sala no encontrada para esta función']);
        exit;
    }
    
    // Obtener asientos de la sala
    $stmt = $pdo->prepare('SELECT * FROM asientos WHERE sala_id = :sala_id ORDER BY fila, numero');
    $stmt->execute(['sala_id' => $sala['sala_id']]);
    $asientos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Obtener asientos ya reservados para esta función
    $stmt = $pdo->prepare('
        SELECT ar.asiento_id 
        FROM asientos_reservados ar 
        WHERE ar.funcion_id = :function_id
    ');
    $stmt->execute(['function_id' => $function_id]);
    $asientos_ocupados = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Obtener asientos bloqueados temporalmente (que no han expirado)
    $stmt = $pdo->prepare('
        SELECT asiento_id 
        FROM asientos_bloqueados 
        WHERE funcion_id = :function_id AND expiracion > NOW()
    ');
    $stmt->execute(['function_id' => $function_id]);
    $asientos_bloqueados = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Limpiar asientos bloqueados expirados
    $pdo->prepare('DELETE FROM asientos_bloqueados WHERE expiracion <= NOW()')->execute();
    
    $response = [
        'success' => true,
        'sala' => $sala,
        'asientos' => $asientos,
        'ocupados' => $asientos_ocupados,
        'bloqueados' => $asientos_bloqueados
    ];
    
    echo json_encode($response);
    
} catch (PDOException $e) {
    error_log('Error en get_seats.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error al obtener los asientos: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log('Error general en get_seats.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
?>