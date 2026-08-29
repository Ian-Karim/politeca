<?php
include 'config.php';
session_start();

// Obtener datos del formulario
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';

// Validaciones básicas
if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Email y contraseña son obligatorios']);
    exit;
}

try {
    // Buscar usuario por email
    $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && password_verify($password, $user['password'])) {
        // Iniciar sesión
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['nombre'];
        $_SESSION['user_email'] = $user['email'];
        
        echo json_encode([
            'success' => true, 
            'message' => 'Inicio de sesión exitoso',
            'user' => [
                'id' => $user['id'],
                'name' => $user['nombre'],
                'email' => $user['email']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Credenciales incorrectas']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error en el inicio de sesión: ' . $e->getMessage()]);
}
?>