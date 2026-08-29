# Politeca — Sistema de Reservas de Cine 
Sistema web de reservas de boletos de cine, desarrollado como proyecto de
aprendizaje. Permite seleccionar película, horario, asientos en tiempo real
(con bloqueo temporal), y simular el proceso de pago hasta la confirmación.

## Tecnologías

- **Frontend:** HTML, CSS, JavaScript (Fetch API, async/await) — carpetas `css/` y `js/`
- **Backend:** PHP con PDO y prepared statements — carpeta `php/`
- **Base de datos:** MySQL

## Funcionalidades

- Selección de película, función y sala
- Sistema de asientos con bloqueo temporal (5 minutos) para evitar
  doble reserva mientras otro usuario está comprando
- Registro e inicio de sesión con contraseñas hasheadas (`password_hash`)
- Simulación de flujo de pago y confirmación con código de reserva único

## Cómo ejecutarlo localmente

1. Instala XAMPP y coloca esta carpeta dentro de `htdocs/`
2. Importa `cinemadb-VF__3_.sql` en phpMyAdmin (crea una base llamada `cinemadb`)
3. Copia `php/config.example.php` como `php/config.php` y ajusta tus
   credenciales locales de MySQL
4. Abre `http://localhost/politeca/` en tu navegador

## Limitaciones conocidas / próximas mejoras

- Los endpoints no cuentan con autenticación por token/API key
- CORS abierto (`Access-Control-Allow-Origin: *`) — se restringiría en producción
- Proyecto con fines educativos: los pagos son simulados, no se procesa
  dinero real (para usar una cuenta valida prueba 5555 5555 5555 4444 en la info de la tarjeta)

---
¡Siempre abierto a retos y oportunidades de desarrollo profesional!
