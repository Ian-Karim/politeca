<?php
include 'config.php';

// --- INICIO DE LA MODIFICACIÓN (V2 - Segura para AWS) ---
try {
    $stmt_check_today = $pdo->prepare('SELECT 1 FROM funciones WHERE fecha = CURDATE() LIMIT 1');
    $stmt_check_today->execute();

    // Si no hay funciones para hoy, ejecutar el script de generación
    if ($stmt_check_today->rowCount() == 0) {
        // Incluir el script V2 (el "inteligente") generará las funciones
        // de forma segura sin crear duplicados.
        include 'generar_funciones.php';
    }
} catch (Exception $e) {
    error_log('Error al verificar/generar funciones: ' . $e->getMessage());
}
// --- FIN DE LA MODIFICACIÓN ---

// Habilitar reporte de errores para depuración
error_reporting(E_ALL);
ini_set('display_errors', 1);

$movie_id = $_GET['movie_id'] ?? null;

if (!$movie_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Se requiere el ID de la película']);
    exit;
}

try {
    $stmt = $pdo->prepare('
        SELECT f.*, s.nombre as sala_nombre, s.tipo as sala_tipo 
        FROM funciones f 
        JOIN salas s ON f.sala_id = s.id 
        WHERE f.pelicula_id = :movie_id 
        AND f.fecha >= CURDATE()
        ORDER BY f.fecha, f.hora
    ');
    $stmt->execute(['movie_id' => $movie_id]);
    $showtimes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Para depuración: ver el número de funciones encontradas
    error_log("Funciones encontradas para movie_id $movie_id: " . count($showtimes));
    
    // Si no hay funciones para esta película, mostrar un mensaje
    if (empty($showtimes)) {
        // Verificar si la película existe
        $stmt_movie = $pdo->prepare('SELECT titulo FROM peliculas WHERE id = :movie_id');
        $stmt_movie->execute(['movie_id' => $movie_id]);
        $movie = $stmt_movie->fetch(PDO::FETCH_ASSOC);
        
        if (!$movie) {
            echo json_encode(['error' => 'La película no existe']);
        } else {
            echo json_encode([
                'info' => 'No hay funciones disponibles para esta película',
                'movie_title' => $movie['titulo']
            ]);
        }
        exit;
    }
    
    header('Content-Type: application/json');
    echo json_encode($showtimes);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al obtener las funciones: ' . $e->getMessage()]);
}
?> 