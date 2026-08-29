<?php
include 'config.php';

// Obtener datos del formulario
$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$password = $_POST['password'] ?? '';
$confirm_password = $_POST['confirm_password'] ?? '';

// Validaciones básicas
if (empty($name) || empty($email) || empty($password) || empty($confirm_password)) {
    echo json_encode(['success' => false, 'message' => 'Todos los campos son obligatorios']);
    exit;
}

if ($password !== $confirm_password) {
    echo json_encode(['success' => false, 'message' => 'Las contraseñas no coinciden']);
    exit;
}

if (strlen($password) < 6) {
    echo json_encode(['success' => false, 'message' => 'La contraseña debe tener al menos 6 caracteres']);
    exit;
}

try {
    // Verificar si el email ya existe
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = ?');
    $stmt->execute([$email]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => false, 'message' => 'El correo electrónico ya está registrado']);
        exit;
    }
    
    // Hash de la contraseña
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
    // Insertar nuevo usuario
    $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)');
    $stmt->execute([$name, $email, $hashed_password]);
    
    echo json_encode(['success' => true, 'message' => 'Registro exitoso. Ahora puedes iniciar sesión.']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error en el registro: ' . $e->getMessage()]);
}
?>