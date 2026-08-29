<?php
include 'config.php';
session_start(); // Es buena práctica iniciar sesión aquí también

// Headers
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

// Simplificamos la obtención de datos y la validación inicial
$funcion_id = $data['funcion_id'] ?? null;
$asientos_ids = $data['asientos_ids'] ?? []; // Aseguramos que sea un array
$boletos = $data['boletos'] ?? [];
$usuario_id = $data['usuario_id'] ?? 1; // Un usuario por defecto si no hay login

if (!$funcion_id || empty($asientos_ids) || empty($boletos)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos incompletos: funcion_id, asientos_ids y boletos son requeridos.']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // 1. Verificar que los asientos seleccionados no estén ya OCUPADOS por otra persona
    $placeholders = implode(',', array_fill(0, count($asientos_ids), '?'));
    $stmt_check = $pdo->prepare("
        SELECT asiento_id FROM asientos_reservados 
        WHERE funcion_id = ? AND asiento_id IN ($placeholders)
    ");
    $params = array_merge([$funcion_id], $asientos_ids);
    $stmt_check->execute($params);

    if ($stmt_check->rowCount() > 0) {
        $ocupados = implode(', ', $stmt_check->fetchAll(PDO::FETCH_COLUMN));
        throw new Exception("Lo sentimos, los asientos $ocupados fueron reservados por alguien más mientras completabas tu compra.");
    }
    
    // 2. Generar código de reserva y calcular total (precio oficial del servidor,
    //    NUNCA se confía en el precio que manda el cliente)
    $codigo_reserva = generarCodigoReserva($pdo);

    $precios_oficiales = [
        'adult'  => 120.00,
        'child'  => 80.00,
        'senior' => 60.00
    ];

    $total = 0;
    foreach ($boletos as $boleto) {
        $tipo = $boleto['tipo'] ?? null;
        $cantidad = $boleto['cantidad'] ?? 0;

        if (!isset($precios_oficiales[$tipo]) || $cantidad <= 0) {
            continue; // Ignora tipos desconocidos o cantidades inválidas
        }

        $total += $precios_oficiales[$tipo] * $cantidad;
    }

    // 3. Crear la reserva principal
    $stmt_reserva = $pdo->prepare('
        INSERT INTO reservas (funcion_id, usuario_id, total, codigo_reserva) 
        VALUES (:funcion_id, :usuario_id, :total, :codigo_reserva)
    ');
    $stmt_reserva->execute([
        'funcion_id' => $funcion_id,
        'usuario_id' => $usuario_id,
        'total' => $total,
        'codigo_reserva' => $codigo_reserva
    ]);
    $reserva_id = $pdo->lastInsertId();
    
    // 4. Marcar los asientos como permanentemente OCUPADOS
    $stmt_ocupar = $pdo->prepare('
        INSERT INTO asientos_reservados (funcion_id, asiento_id, reserva_id) 
        VALUES (:funcion_id, :asiento_id, :reserva_id)
    ');
    foreach ($asientos_ids as $asiento_id) {
        $stmt_ocupar->execute([
            'funcion_id' => $funcion_id,
            'asiento_id' => $asiento_id,
            'reserva_id' => $reserva_id
        ]);
    }

    // 5. *** EL PASO CLAVE QUE FALTABA ***
    // Eliminar los asientos de la tabla de BLOQUEADOS, ya que la compra fue exitosa.
    $stmt_borrar_bloqueo = $pdo->prepare(
        "DELETE FROM asientos_bloqueados WHERE funcion_id = ? AND asiento_id IN ($placeholders)"
    );
    $stmt_borrar_bloqueo->execute($params); // Reutilizamos $params de la verificación

    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'reserva_id' => $reserva_id,
        'codigo_reserva' => $codigo_reserva
    ]);
    
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

// Función para generar código de reserva único (sin cambios)
function generarCodigoReserva($pdo) {
    $caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $max_intentos = 10;
    $intento = 0;
    
    while ($intento < $max_intentos) {
        $codigo = substr(str_shuffle($caracteres), 0, 8);
        $stmt = $pdo->prepare('SELECT id FROM reservas WHERE codigo_reserva = ?');
        $stmt->execute([$codigo]);
        
        if (!$stmt->fetch()) {
            return $codigo;
        }
        $intento++;
    }
    
    throw new Exception('No se pudo generar un código de reserva único');
}
?>