<?php
/*
 * GENERADOR DE FUNCIONES AUTOMÁTICO v2
 * Este script es "idempotente", lo que significa que
 * puede ejecutarse 100 veces y el resultado será el mismo.
 * Verifica cada función antes de insertarla.
 */

// No incluir 'config.php' aquí, se asume que ya está incluido.
try {
    $pdo->beginTransaction();
    
    // Horarios a generar
    $horarios = ['14:00:00', '17:30:00', '21:00:00'];
    
    // Obtener películas y salas activas
    $peliculas = $pdo->query('SELECT id FROM peliculas WHERE activa = 1')->fetchAll(PDO::FETCH_COLUMN);
    $salas = $pdo->query('SELECT id, tipo FROM salas WHERE activa = 1')->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($peliculas) || empty($salas)) {
        throw new Exception("No hay películas o salas activas para generar funciones.");
    }

    // Preparar los SPU (Stored Procedures de PHP, je)
    $stmt_check = $pdo->prepare(
        'SELECT 1 FROM funciones 
         WHERE pelicula_id = :pelicula_id AND sala_id = :sala_id AND fecha = :fecha AND hora = :hora 
         LIMIT 1'
    );
    
    $stmt_insert = $pdo->prepare(
        'INSERT INTO funciones (pelicula_id, sala_id, fecha, hora, precio_base) 
         VALUES (:pelicula_id, :sala_id, :fecha, :hora, :precio_base)'
    );

    // Loop para los próximos 7 días (desde hoy)
    for ($i = 0; $i < 7; $i++) {
        $fecha_actual = date('Y-m-d', strtotime("+$i days"));
        
        $pelicula_index = 0;
        
        foreach ($salas as $sala) {
            $sala_id = $sala['id'];
            $pelicula_id = $peliculas[$pelicula_index % count($peliculas)];
            
            // Asignar precio base por tipo de sala
            $precio = 120.00;
            if ($sala['tipo'] == '3D') $precio = 150.00;
            if ($sala['tipo'] == 'IMAX') $precio = 180.00;

            foreach ($horarios as $hora) {
                // --- ESTA ES LA LÓGICA MEJORADA ---
                // 1. Revisar si ESTA función específica ya existe
                $stmt_check->execute([
                    'pelicula_id' => $pelicula_id,
                    'sala_id' => $sala_id,
                    'fecha' => $fecha_actual,
                    'hora' => $hora
                ]);
                
                // 2. Si no existe (rowCount == 0), la insertamos
                if ($stmt_check->rowCount() == 0) {
                    $stmt_insert->execute([
                        'pelicula_id' => $pelicula_id,
                        'sala_id' => $sala_id,
                        'fecha' => $fecha_actual,
                        'hora' => $hora,
                        'precio_base' => $precio
                    ]);
                }
                // Si ya existe, simplemente no hace nada.
            }
            
            $pelicula_index++;
        }
    }
    
    $pdo->commit();
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Error al generar funciones: ' . $e->getMessage());
}
?>  