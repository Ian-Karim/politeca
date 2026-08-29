// Variables globales para almacenar el estado de la reserva
// Variable global para el usuario
let currentUser = null;
let selectedMovieId = null;
let selectedMovieTitle = null;
let selectedShowtimeId = null;
let selectedShowtimeDate = null;
let selectedShowtimeTime = null;
let selectedShowtimeRoom = null;
let selectedRoomId = null;
let selectedRoomName = null;
let selectedSeats = [];
let ticketCounts = {
    adult: 0,
    child: 0,
    senior: 0
};

// Precios de los boletos
const ticketPrices = {
    adult: 120.00,
    child: 80.00,
    senior: 60.00
};

// Variable para el intervalo de verificación
let asientosVerificationInterval = null;

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeSeats();
    loadMovies();
    liberarTodosAsientos();
});

// Inicializar todos los event listeners
function initializeEventListeners() {
    // Navegación entre pestañas
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Botones de navegación (excepto el de confirmación)
    document.querySelectorAll('.btn-next:not([data-next="confirmacion"])').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.next));
    });

    // Botón de confirmación especial
    document.querySelector('[data-next="confirmacion"]').addEventListener('click', (e) => {
        e.preventDefault();
        completeReservation();
    });

    // Botones de anterior
    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.prev));
    });

    // Modal de login
    document.getElementById('login-btn').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'flex';
    });

    document.getElementById('close-login').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'none';
    });

    document.getElementById('go-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('register-modal').style.display = 'flex';
    });

    // Modal de registro
    document.getElementById('register-btn').addEventListener('click', () => {
        document.getElementById('register-modal').style.display = 'flex';
    });

    document.getElementById('close-register').addEventListener('click', () => {
        document.getElementById('register-modal').style.display = 'none';
    });

    document.getElementById('go-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-modal').style.display = 'none';
        document.getElementById('login-modal').style.display = 'flex';
    });

    // Controles de boletos
    document.querySelectorAll('.ticket-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const type = e.target.dataset.type;
            updateTicketCount(type, action);
        });
    });

    // Botón para nueva reserva
    document.getElementById('new-reservation').addEventListener('click', () => {
        resetReservation();
        switchTab('cartelera');
    });

    // Formulario de registro
    document.getElementById('do-register').addEventListener('click', handleRegister);

    // Formulario de login
    document.getElementById('do-login').addEventListener('click', handleLogin);

    // Prevenir copiar/pegar en campos de tarjeta y CVV
    document.getElementById('card-number').addEventListener('paste', preventPaste);
    document.getElementById('cvv').addEventListener('paste', preventPaste);
    document.getElementById('expiry').addEventListener('paste', preventPaste);

    // Validación en tiempo real para los campos de pago
   document.getElementById('card-number').addEventListener('input', (e) => {
    formatCardNumber(e);
    updateReservationButtonState(); // <-- AÑADIR ESTA LÍNEA
});
    document.getElementById('expiry').addEventListener('input', (e) => {
    formatExpiry(e);
    updateReservationButtonState(); // <-- AÑADIR ESTA LÍNEA
});
    document.getElementById('cvv').addEventListener('input', (e) => {
    validateCVV(e);
    updateReservationButtonState(); // <-- AÑADIR ESTA LÍNEA
});
   document.getElementById('name').addEventListener('input', (e) => {
    validateName(e);
    updateReservationButtonState(); // <-- AÑADIR ESTA LÍNEA
});
    document.getElementById('email').addEventListener('input', (e) => {
    validateEmail(e);
    updateReservationButtonState(); // <-- AÑADIR ESTA LÍNEA
});

    // Actualizar estado del botón de reserva
    document.querySelectorAll('.ticket-btn').forEach(btn => {
        btn.addEventListener('click', updateReservationButtonState);
    });

    // Inicializar el estado del botón
    updateReservationButtonState();
}

function preventPaste(e) {
    e.preventDefault();
    alert('Por seguridad, no está permitido pegar contenido en este campo.');
}

// Cargar películas desde la base de datos
async function loadMovies() {
    try {
        const response = await fetch('php/get_movies.php');
        
        if (!response.ok) {
            throw new Error('Error al cargar películas');
        }
        
        const movies = await response.json();
        
        const movieGrid = document.querySelector('.movie-grid');
        movieGrid.innerHTML = '';
        
        movies.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.dataset.movie = movie.id;
            
            movieCard.innerHTML = `
                <div class="movie-poster" style="background-image: url('${movie.poster_url}')"></div>
                <div class="movie-info">
                    <h3 class="movie-title">${movie.titulo}</h3>
                    <p class="movie-details">Duración: ${movie.duracion} • ${movie.genero}</p>
                </div>
            `;
            
            movieCard.addEventListener('click', () => {
                selectMovie(movie.id, movie.titulo);
            });
            
            movieGrid.appendChild(movieCard);
        });
    } catch (error) {
        console.error('Error al cargar películas:', error);
        setupDefaultMovieListeners();
    }
}

// Configurar event listeners para las películas por defecto
function setupDefaultMovieListeners() {
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const movieId = card.dataset.movie;
            const movieTitle = card.querySelector('.movie-title').textContent;
            selectMovie(movieId, movieTitle);
        });
    });
}

// Seleccionar una película
function selectMovie(movieId, movieTitle) {
    document.querySelectorAll('.movie-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    const selectedCard = document.querySelector(`.movie-card[data-movie="${movieId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    selectedMovieId = movieId;
    selectedMovieTitle = movieTitle;
    
    document.getElementById('selected-movie').textContent = movieTitle;
    loadShowtimes(movieId);
}

// Cargar horarios y salas desde la base de datos
async function loadShowtimes(movieId) {
    try {
        const response = await fetch(`php/get_showtimes.php?movie_id=${movieId}`);
        const data = await response.json();
        
        // Asegúrate que la primera línea de la función sea esta
const showtimesContainer = document.querySelector('#horarios-container'); // Usamos el ID correcto
showtimesContainer.innerHTML = '<h3>Horarios disponibles</h3>'; // Esto crea el título
        
        if (Array.isArray(data)) {
            if (data.length === 0) {
                showtimesContainer.innerHTML += '<p class="no-showtimes">No hay funciones disponibles para esta película</p>';
            } else {
                data.forEach(showtime => {
                    const date = new Date(showtime.fecha + 'T' + showtime.hora);
                    const formattedDate = date.toLocaleDateString('es-ES', { 
                        weekday: 'short', 
                        day: 'numeric',
                        month: 'short'
                    });
                    const formattedTime = date.toLocaleTimeString('es-ES', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                    
                    const button = document.createElement('button');
                    button.className = 'showtime-btn';
                    button.dataset.showtime = showtime.id;
                    button.dataset.salaId = showtime.sala_id;
                    button.dataset.salaNombre = showtime.sala_nombre;
                    button.dataset.salaTipo = showtime.sala_tipo;
                    button.textContent = `${formattedDate} - ${formattedTime} (${showtime.sala_nombre})`;
                    
                    button.addEventListener('click', (e) => {
                        document.querySelectorAll('.showtime-btn').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        e.target.classList.add('selected');
                        
                        const salaId = e.target.dataset.salaId;
                        const salaNombre = e.target.dataset.salaNombre;
                        const salaTipo = e.target.dataset.salaTipo;
                        
                        selectShowtime(
                            showtime.id, 
                            formattedDate, 
                            formattedTime, 
                            `${salaNombre} - ${salaTipo}`,
                            salaId
                        );
                    });
                    
                    showtimesContainer.appendChild(button);
                });
            }
        } else if (data.info) {
            showtimesContainer.innerHTML += `<p class="no-showtimes">${data.info}</p>`;
        } else if (data.error) {
            showtimesContainer.innerHTML += `<p class="error">${data.error}</p>`;
        }
        
        await loadRooms();
        
    } catch (error) {
        console.error('Error al cargar funciones:', error);
        const showtimesContainer = document.querySelector('#funcion-content .showtimes');
        showtimesContainer.innerHTML = '<p class="error">Error al cargar las funciones</p>';
    }
}

// Función para cargar salas
async function loadRooms() {
    try {
        const response = await fetch('php/get_rooms.php');
        const rooms = await response.json();
        
        // Asegúrate que la primera línea de la función sea esta
let roomsContainer = document.querySelector('#salas-container'); // Usamos el ID correcto
        if (!roomsContainer) {
            roomsContainer = document.createElement('div');
            roomsContainer.className = 'rooms-container';
            document.querySelector('#funcion-content').appendChild(roomsContainer);
        }
roomsContainer.innerHTML = '<h3>Salas disponibles</h3>'; // Esto crea el título
        
        if (Array.isArray(rooms) && rooms.length > 0) {
            rooms.forEach(room => {
                const roomButton = document.createElement('button');
                roomButton.className = 'room-btn';
                roomButton.dataset.room = room.id;
                roomButton.textContent = `${room.nombre} - ${room.tipo}`;
                
                roomButton.addEventListener('click', () => {
                    document.querySelectorAll('.room-btn').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    roomButton.classList.add('selected');
                    
                    selectedRoomId = room.id;
                    selectedRoomName = `${room.nombre} - ${room.tipo}`;
                    selectedShowtimeRoom = selectedRoomName;
                    document.getElementById('selected-room').textContent = selectedRoomName;
                });
                
                roomsContainer.appendChild(roomButton);
            });
        } else {
            roomsContainer.innerHTML += '<p>No hay salas disponibles</p>';
        }
    } catch (error) {
        console.error('Error al cargar salas:', error);
    }
}

// Seleccionar una función - ESTA ES LA FUNCIÓN QUE FALTABA
function selectShowtime(showtimeId, date, time, room, salaId = null) {
    selectedShowtimeId = showtimeId;
    selectedShowtimeDate = date;
    selectedShowtimeTime = time;
    selectedShowtimeRoom = room;
    selectedRoomId = salaId;
    selectedRoomName = room;
    
    // Actualiza la pestaña de Boletos
    document.getElementById('selected-showtime').textContent = `${date} - ${time}`;
    document.getElementById('selected-room').textContent = room;
    
    // Actualiza también la pestaña de Asientos
    document.getElementById('selected-showtime-asientos').textContent = `${date} - ${time}`;
    document.getElementById('selected-room-asientos').textContent = room;

    // --- INICIO DE LA NUEVA LÓGICA ---
    // Sincronizar la selección de "Salas disponibles"
    document.querySelectorAll('.room-btn').forEach(btn => {
        // Comparamos el data-room del botón con el salaId de la función
        if (btn.dataset.room == salaId) {
            btn.classList.add('selected'); // Selecciona la sala correcta
            btn.disabled = false; // Nos aseguramos de que se pueda "clickear" (aunque ya no es necesario)
        } else {
            btn.classList.remove('selected'); // Deselecciona las otras
            btn.disabled = true; // Deshabilita las otras para evitar clics
        }
    });
    // --- FIN DE LA NUEVA LÓGICA ---
    
    loadSeats(showtimeId);
}

// Cargar asientos desde la base de datos
async function loadSeats(showtimeId) {
    try {
        console.log('Cargando asientos para función:', showtimeId);
        
        const response = await fetch(`php/get_seats.php?function_id=${showtimeId}`);
        const responseText = await response.text();
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('La respuesta no es JSON válido:', responseText);
            throw new Error('El servidor devolvió una respuesta inválida');
        }
        
        console.log('Datos recibidos de get_seats.php:', data);
        
        const seatsGrid = document.getElementById('seats-grid');
        seatsGrid.innerHTML = '';
        
        if (!data.asientos || data.asientos.length === 0) {
            seatsGrid.innerHTML = '<p class="no-seats">No hay asientos disponibles para esta función</p>';
            return;
        }
        
        const seatsByRow = {};
        data.asientos.forEach(seat => {
            if (!seatsByRow[seat.fila]) {
                seatsByRow[seat.fila] = [];
            }
            seatsByRow[seat.fila].push(seat);
        });
        
        for (const row in seatsByRow) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'seat-row';
            
            const rowLabel = document.createElement('div');
            rowLabel.className = 'row-label';
            rowLabel.textContent = row;
            rowDiv.appendChild(rowLabel);
            
            seatsByRow[row].sort((a, b) => a.numero - b.numero).forEach(seat => {
                const seatButton = document.createElement('button');
                seatButton.className = 'seat';
                seatButton.dataset.seatId = seat.id;
                seatButton.dataset.seat = `${row}${seat.numero}`;
                seatButton.textContent = seat.numero;
                
                const seatIdNum = parseInt(seat.id);
                
                if (data.ocupados && data.ocupados.some(id => parseInt(id) === seatIdNum)) {
                    seatButton.classList.add('occupied');
                    seatButton.disabled = true;
                    seatButton.title = 'Asiento ocupado';
                }
                
                if (data.bloqueados && data.bloqueados.some(id => parseInt(id) === seatIdNum)) {
                    seatButton.classList.add('blocked');
                    seatButton.disabled = true;
                    seatButton.title = 'Asiento bloqueado temporalmente';
                }
                
                seatButton.addEventListener('click', () => toggleSeatSelection(seatButton));
                rowDiv.appendChild(seatButton);
            });
            
            seatsGrid.appendChild(rowDiv);
        }
        
       // Iniciar verificación periódica de asientos
if (asientosVerificationInterval) {
    clearInterval(asientosVerificationInterval);
}
asientosVerificationInterval = setInterval(() => {
    console.log('Verificación periódica de asientos...');
    actualizarEstadoAsientos(showtimeId);
}, 1000); // 1 segundos
        
    } catch (error) {
        console.error('Error al cargar asientos:', error);
        
        const seatsGrid = document.getElementById('seats-grid');
        seatsGrid.innerHTML = `
            <div class="error-message">
                <p>Error al cargar los asientos: ${error.message}</p>
                <button onclick="loadSeats(${showtimeId})" class="btn">Reintentar</button>
            </div>
        `;
        
        initializeSeats();
    }
}

// Inicializar asientos predeterminados
function initializeSeats() {
    const seatsGrid = document.getElementById('seats-grid');
    seatsGrid.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        const rowLetter = String.fromCharCode(65 + row);
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        
        const rowLabel = document.createElement('div');
        rowLabel.className = 'row-label';
        rowLabel.textContent = rowLetter;
        rowDiv.appendChild(rowLabel);
        
        for (let seatNum = 1; seatNum <= 10; seatNum++) {
            const seat = document.createElement('button');
            seat.className = 'seat';
            seat.textContent = seatNum;
            seat.dataset.seat = `${rowLetter}${seatNum}`;
            
            seat.addEventListener('click', () => toggleSeatSelection(seat));
            rowDiv.appendChild(seat);
        }
        
        seatsGrid.appendChild(rowDiv);
    }
}

// Función para bloquear un asiento
// Función para bloquear un asiento
async function bloquearAsiento(asientoId) {
    if (!selectedShowtimeId) return;
    
    try {
        console.log('Bloqueando asiento:', asientoId, 'para función:', selectedShowtimeId);
        
        const response = await fetch('php/bloquear_asiento.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                funcion_id: selectedShowtimeId,
                asiento_id: asientoId
            })
        });
        
        const result = await response.json();
        console.log('Respuesta de bloquear_asiento.php:', result);
        
        if (!result.success) {
            console.error('Error al bloquear asiento:', result.message);
            // Si el asiento ya está ocupado, actualizar la interfaz
            await actualizarEstadoAsientos(selectedShowtimeId);
            
            // Remover el asiento de la selección si ya no está disponible
            if (result.message.includes('ya está ocupado')) {
                selectedSeats = selectedSeats.filter(s => s !== asientoId);
                updateSelectedSeatsDisplay();
                
                // Actualizar visualmente
                document.querySelectorAll('.seat').forEach(seat => {
                    const seatId = seat.dataset.seatId || seat.dataset.seat;
                    if (seatId === asientoId) {
                        seat.classList.remove('selected');
                        seat.classList.add('occupied');
                        seat.disabled = true;
                    }
                });
            }
        } else {
            console.log('Asiento bloqueado exitosamente');
        }
    } catch (error) {
        console.error('Error al bloquear asiento:', error);
    }
}
// Función para liberar un asiento
async function liberarAsiento(asientoId) {
    if (!selectedShowtimeId) return;
    
    try {
        await fetch('php/liberar_asiento.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                funcion_id: selectedShowtimeId,
                asiento_id: asientoId
            })
        });
    } catch (error) {
        console.error('Error al liberar asiento:', error);
    }
}

// Función para liberar todos los asientos de la sesión
async function liberarTodosAsientos() {
    try {
        await fetch('php/liberar_asiento.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({liberar_todos: true})
        });
    } catch (error) {
        console.error('Error al liberar asientos:', error);
    }
}

// Función para actualizar el estado de los asientos
async function actualizarEstadoAsientos(showtimeId) {
    if (!showtimeId) return;
    
    try {
        console.log('Actualizando estado de asientos para función:', showtimeId);
        
        const response = await fetch(`php/verificar_asientos_bloqueados.php?funcion_id=${showtimeId}`);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.text();
        let asientosBloqueados;
        
        try {
            asientosBloqueados = JSON.parse(responseText);
            console.log('Asientos bloqueados recibidos:', asientosBloqueados);
        } catch (e) {
            console.error('Error parsing JSON:', responseText);
            return;
        }
        
        // También obtener asientos ocupados
        const responseOcupados = await fetch(`php/get_seats.php?function_id=${showtimeId}`);
        const dataOcupados = await responseOcupados.json();
        
        const asientosOcupados = dataOcupados.ocupados || [];
        console.log('Asientos ocupados:', asientosOcupados);
        
        // Actualizar la interfaz para mostrar asientos bloqueados y ocupados
        document.querySelectorAll('.seat').forEach(seat => {
            const seatId = seat.dataset.seatId ? parseInt(seat.dataset.seatId) : null;
            
            if (!seatId) {
                return;
            }
            
            // No modificar asientos seleccionados por el usuario actual
            const isSelectedByUser = selectedSeats.some(selected => {
                return parseInt(selected) === seatId || selected === seat.dataset.seat;
            });
            
            if (isSelectedByUser) return;
            
            // Verificar si está ocupado
            const isOccupied = asientosOcupados.some(id => parseInt(id) === seatId);
            
            if (isOccupied) {
                seat.classList.add('occupied');
                seat.classList.remove('blocked', 'selected');
                seat.disabled = true;
                seat.title = 'Asiento ocupado';
                return;
            }
            
            // Verificar si está bloqueado
            const isBlocked = asientosBloqueados.some(id => parseInt(id) === seatId);
            
            if (isBlocked && !seat.classList.contains('occupied')) {
                seat.classList.add('blocked');
                seat.disabled = true;
                seat.title = 'Asiento bloqueado temporalmente';
            } else if (seat.classList.contains('blocked') && !isBlocked) {
                seat.classList.remove('blocked');
                seat.disabled = false;
                seat.title = '';
            }
        });
        
    } catch (error) {
        console.error('Error al actualizar estado de asientos:', error);
    }
}

// Alternar selección de asiento
function toggleSeatSelection(seat) {
    const seatId = seat.dataset.seatId || seat.dataset.seat;
    
    if (seat.classList.contains('selected')) {
        seat.classList.remove('selected');
        selectedSeats = selectedSeats.filter(s => s !== seatId);
        liberarAsiento(seatId);
    } else {
        const totalTickets = ticketCounts.adult + ticketCounts.child + ticketCounts.senior;
        
        if (selectedSeats.length < totalTickets) {
            seat.classList.add('selected');
            selectedSeats.push(seatId);
            bloquearAsiento(seatId);
        } else {
            alert(`Solo puedes seleccionar ${totalTickets} asientos para los boletos que elegiste.`);
        }
    }
    
    updateSelectedSeatsDisplay();
}

// Cambiar entre pestañas
function switchTab(tabName) {
    
    if (tabName === 'pago' && currentUser === null) {
        // Si el usuario quiere ir a "Pago" PERO no ha iniciado sesión
        alert('Por favor, inicia sesión para continuar con el pago.');
        document.getElementById('login-modal').style.display = 'flex'; // Mostrar el modal de login
        return; // Detener la función aquí, no cambiar de pestaña
    
    // --- INICIO DE LA NUEVA LÓGICA ---
    } else if (tabName === 'funcion') {
        // Si el usuario vuelve a la pestaña de "Función",
        // re-habilitamos todos los botones de sala para que pueda elegir de nuevo.
        document.querySelectorAll('.room-btn').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('selected');
        });
        // También deseleccionamos los horarios
        document.querySelectorAll('.showtime-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
    }
    // --- FIN DE LA NUEVA LÓGICA ---

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabName}-content`).classList.add('active');
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    if (tabName === 'asientos') {
        document.getElementById('tickets-count').textContent = 
            ticketCounts.adult + ticketCounts.child + ticketCounts.senior;
    } else if (tabName === 'confirmacion') {
        updateConfirmationDetails();
    }
}

// Actualizar visualización de asientos seleccionados
function updateSelectedSeatsDisplay() {
    const selectedSeatsCount = document.getElementById('selected-seats-count');
    const selectedSeatsList = document.getElementById('selected-seats-list');
    
    selectedSeatsCount.textContent = selectedSeats.length;
    
    if (selectedSeats.length > 0) {
        selectedSeatsList.innerHTML = selectedSeats.join(', ');
    } else {
        selectedSeatsList.innerHTML = 'Ningún asiento seleccionado';
    }
}

// Actualizar contador de boletos
function updateTicketCount(type, action) {
    const countElement = document.getElementById(`${type}-count`);
    let count = parseInt(countElement.textContent);
    
    if (action === 'increase') {
        count++;
    } else if (action === 'decrease' && count > 0) {
        count--;
    }
    
    countElement.textContent = count;
    ticketCounts[type] = count;
    
    updateTicketSummary();
}

// Actualizar resumen de boletos
function updateTicketSummary() {
    const ticketDetails = document.getElementById('ticket-details');
    const totalAmount = document.getElementById('total-amount');
    
    let detailsHTML = '';
    let total = 0;
    
    for (const type in ticketCounts) {
        if (ticketCounts[type] > 0) {
            const typeText = type === 'adult' ? 'Adulto' : 
                            type === 'child' ? 'Niño' : 'Persona Mayor';
            const subtotal = ticketCounts[type] * ticketPrices[type];
            total += subtotal;
            
            detailsHTML += `<p>${ticketCounts[type]} ${typeText}: $${subtotal.toFixed(2)} MXN</p>`;
        }
    }
    
    if (detailsHTML === '') {
        detailsHTML = '<p>No hay boletos seleccionados</p>';
    }
    
    ticketDetails.innerHTML = detailsHTML;
    totalAmount.textContent = total.toFixed(2);
}

// Manejar registro de usuario
async function handleRegister() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
        alert('Las contraseñas no coinciden');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('confirm_password', confirm);

        const response = await fetch('php/register.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert(result.message);
            document.getElementById('register-modal').style.display = 'none';
            document.getElementById('register-name').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm').value = '';
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error al registrar:', error);
        alert('Error al registrar');
    }
}

// Manejar inicio de sesión
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);

        const response = await fetch('php/login.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            currentUser = result.user; // <-- AÑADIR ESTA LÍNEA
            alert(result.message);
            document.getElementById('login-modal').style.display = 'none';
            document.querySelector('.user-section').innerHTML = `
                <span>Bienvenido, ${result.user.name}</span>
                <button id="logout-btn"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</button>
            `;
            
            document.getElementById('logout-btn').addEventListener('click', handleLogout);
            document.getElementById('login-email').value = '';
            document.getElementById('login-password').value = '';
        } else {
            alert('Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error al iniciar sesión');
    }
}

// Manejar cierre de sesión
function handleLogout() {
    currentUser = null;
    document.querySelector('.user-section').innerHTML = `
        <button id="login-btn"><i class="fas fa-user"></i> Iniciar Sesión</button>
        <button id="register-btn"><i class="fas fa-user-plus"></i> Registrarse</button>
    `;
    
    document.getElementById('login-btn').addEventListener('click', () => {
        document.getElementById('login-modal').style.display = 'flex';
    });
    
    document.getElementById('register-btn').addEventListener('click', () => {
        document.getElementById('register-modal').style.display = 'flex';
    });
}

// Función para verificar si todo el formulario es válido
function isFormValid() {
    const nameValid = validateName({ target: document.getElementById('name') });
    const emailValid = validateEmail({ target: document.getElementById('email') });
    const cardValid = validateCardNumber(document.getElementById('card-number').value);
    const expiryValid = validateExpiry(document.getElementById('expiry').value);
    const cvvValid = validateCVV({ target: document.getElementById('cvv') });
    
    return nameValid && emailValid && cardValid && expiryValid && cvvValid;
}

// Actualizar el estado del botón de finalizar reserva
function updateReservationButtonState() {
    const reservationButton = document.querySelector('[data-next="confirmacion"]');

    // --- INICIO DE CÓDIGO DE DEPURACIÓN ---
    console.log("--- Verificando estado del botón ---");
    
    const formValid = isFormValid();
    const showtimeSelected = !!selectedShowtimeId; // Usamos !! para obtener un true/false claro
    const ticketsSelected = (ticketCounts.adult + ticketCounts.child + ticketCounts.senior) > 0;
    const seatsSelected = selectedSeats.length > 0 && selectedSeats.length === (ticketCounts.adult + ticketCounts.child + ticketCounts.senior);

    console.log("¿Formulario de pago es válido?:", formValid);
    console.log("¿Se seleccionó un horario?:", showtimeSelected);
    console.log("¿Se seleccionaron boletos?:", ticketsSelected);
    console.log("¿Se seleccionaron asientos (y coinciden con boletos)?:", seatsSelected);
    // --- FIN DE CÓDIGO DE DEPURACIÓN ---

    const isValid = formValid && showtimeSelected && ticketsSelected && seatsSelected;

    console.log("==> ¿TODAS las condiciones se cumplen?:", isValid, "<==");

    if (isValid) {
        reservationButton.disabled = false;
        reservationButton.classList.remove('btn-disabled');
    } else {
        reservationButton.disabled = true;
        reservationButton.classList.add('btn-disabled');
    }
}

// Función para finalizar la reserva
async function completeReservation() {
    // 1. Mantenemos toda tu validación inicial (¡está perfecta!)
    if (!isFormValid()) {
        alert('Por favor, completa todos los campos de pago correctamente.');
        return;
    }
    if (!selectedShowtimeId) {
        alert('Error: No se ha seleccionado una función.');
        return;
    }
    const totalTickets = ticketCounts.adult + ticketCounts.child + ticketCounts.senior;
    if (totalTickets === 0 || selectedSeats.length !== totalTickets) {
        alert('La cantidad de asientos no coincide con la cantidad de boletos.');
        return;
    }

    try {
        // 2. Simular que el pago con tarjeta fue exitoso
        const paymentSuccess = await processPayment();
        if (!paymentSuccess) {
            alert('Error en el procesamiento del pago. Por favor, intenta nuevamente.');
            return;
        }

        // --- INICIO DEL CÓDIGO NUEVO Y CRÍTICO ---

        // 3. Preparar los datos de la reserva para enviar a PHP
        const boletosParaEnviar = Object.keys(ticketCounts).map(tipo => {
            return {
                tipo: tipo,
                cantidad: ticketCounts[tipo],
                precio: ticketPrices[tipo]
            };
        }).filter(boleto => boleto.cantidad > 0);

        const datosReserva = {
            funcion_id: parseInt(selectedShowtimeId),
            asientos_ids: selectedSeats.map(id => parseInt(id)), // Aseguramos que los IDs sean números
            boletos: boletosParaEnviar,
            usuario_id: currentUser.id // ¡Usamos el ID del usuario que inició sesión! // Usamos 1 como ejemplo si no tienes un sistema de login completo
        };

        // 4. Enviar los datos al script create_reservation.php
        console.log('Enviando datos de reserva al servidor...', datosReserva);
        const response = await fetch('php/create_reservation.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosReserva)
        });

        const result = await response.json();

        if (!result.success) {
            // Si el backend devuelve un error (ej: asiento ya ocupado), lo mostramos
            throw new Error(result.error || 'No se pudo completar la reserva en el servidor.');
        }
        
        console.log('Reserva creada con éxito en la base de datos:', result);
        
        // --- FIN DEL CÓDIGO NUEVO Y CRÍTICO ---

        // 5. Si todo salió bien, mostramos la confirmación final
        updateConfirmationDetails(result.codigo_reserva); // Pasamos el código de reserva REAL
        
        if (asientosVerificationInterval) {
            clearInterval(asientosVerificationInterval);
            asientosVerificationInterval = null;
        }
        
        switchTab('confirmacion');

    } catch (error) {
        console.error('Error al completar la reserva:', error);
        alert('Ocurrió un error al procesar tu reserva: ' + error.message);
    }
}

// Función para simular el procesamiento de pago
async function processPayment() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(true);
        }, 1500);
    });
}

// Función para validar nombre
function validateName(e) {
    const input = e.target.value;
    const validationElement = document.getElementById('name-validation');
    
    if (input.length < 3) {
        validationElement.textContent = 'El nombre debe tener al menos 3 caracteres';
        return false;
    }
    
    if (!/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/.test(input)) {
        validationElement.textContent = 'Solo se permiten letras y espacios';
        return false;
    }
    
    validationElement.textContent = '';
    return true;
}

// Función para validar email - CORREGIDA
function validateEmail(e) {
    const input = e.target.value;
    const validationElement = document.getElementById('email-validation');
    // Expresión regular corregida
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(input)) {
        validationElement.textContent = 'Ingrese un correo electrónico válido';
        return false;
    }
    
    validationElement.textContent = '';
    return true;
}

// Función para validar número de tarjeta
function validateCardNumber(cardNumber) {
    const validationElement = document.getElementById('card-validation');
    const inputElement = document.getElementById('card-number');
    const cleaned = cardNumber.replace(/\s/g, '');
    
    inputElement.classList.remove('valid', 'invalid');
    validationElement.textContent = '';
    
    if (!/^\d+$/.test(cleaned)) {
        validationElement.textContent = 'Solo se permiten números';
        inputElement.classList.add('invalid');
        return false;
    }
    
    if (cleaned.length !== 16) {
        validationElement.textContent = 'El número de tarjeta debe tener 16 dígitos';
        inputElement.classList.add('invalid');
        return false;
    }
    
    if (!isValidLuhn(cleaned)) {
        validationElement.textContent = 'Número de tarjeta inválido';
        inputElement.classList.add('invalid');
        return false;
    }
    
    validationElement.textContent = '✓ Número de tarjeta válido';
    validationElement.style.color = '#27ae60';
    inputElement.classList.add('valid');
    return true;
}

// Algoritmo de Luhn para validar tarjetas de crédito
function isValidLuhn(cardNumber) {
    let sum = 0;
    let isEven = false;
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i), 10);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

// Función para validar fecha de vencimiento
function validateExpiry(expiry) {
    const validationElement = document.getElementById('expiry-validation');
    const inputElement = document.getElementById('expiry');
    
    inputElement.classList.remove('valid', 'invalid');
    validationElement.textContent = '';
    
    if (!expiry) {
        validationElement.textContent = 'Ingrese la fecha de vencimiento';
        inputElement.classList.add('invalid');
        return false;
    }
    
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        validationElement.textContent = 'Formato inválido (use MM/AA)';
        inputElement.classList.add('invalid');
        return false;
    }
    
    const [month, year] = expiry.split('/');
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    if (monthNum < 1 || monthNum > 12) {
        validationElement.textContent = 'Mes inválido';
        inputElement.classList.add('invalid');
        return false;
    }
    
    if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
        validationElement.textContent = 'La tarjeta está vencida';
        inputElement.classList.add('invalid');
        return false;
    }
    
    validationElement.textContent = '✓ Fecha válida';
    validationElement.style.color = '#27ae60';
    inputElement.classList.add('valid');
    return true;
}

// Función para validar CVV
function validateCVV(e) {
    const input = e.target.value.replace(/\D/g, '').substring(0, 4);
    e.target.value = input;
    
    const validationElement = document.getElementById('cvv-validation');
    const inputElement = document.getElementById('cvv');
    
    inputElement.classList.remove('valid', 'invalid');
    validationElement.textContent = '';
    
    if (input.length < 3) {
        validationElement.textContent = 'El CVV debe tener al menos 3 dígitos';
        inputElement.classList.add('invalid');
        return false;
    }
    
    validationElement.textContent = '✓ CVV válido';
    validationElement.style.color = '#27ae60';
    inputElement.classList.add('valid');
    return true;
}

// Formatear número de tarjeta
function formatCardNumber(e) {
    let input = e.target.value.replace(/\D/g, '').substring(0, 16);
    
    let formattedInput = '';
    for (let i = 0; i < input.length; i++) {
        if (i > 0 && i % 4 === 0) {
            formattedInput += ' ';
        }
        formattedInput += input[i];
    }
    
    e.target.value = formattedInput;
    validateCardNumber(input);
}

// Formatear fecha de vencimiento
function formatExpiry(e) {
    let input = e.target.value.replace(/\D/g, '').substring(0, 4);
    
    if (input.length > 2) {
        input = input.replace(/(\d{2})(\d{0,2})/, '$1/$2');
    }
    
    e.target.value = input;
    validateExpiry(input);
}

// Actualizar detalles de confirmación
function updateConfirmationDetails(codigoReserva = null) {
    document.getElementById('conf-movie').textContent = selectedMovieTitle || 'No seleccionada';
    document.getElementById('conf-showtime').textContent = selectedShowtimeDate && selectedShowtimeTime 
        ? `${selectedShowtimeDate} - ${selectedShowtimeTime}` : 'No seleccionada';
    document.getElementById('conf-room').textContent = selectedShowtimeRoom || 'No seleccionada';
    document.getElementById('conf-seats').textContent = selectedSeats.length > 0 
        ? selectedSeats.join(', ') : 'No seleccionados';
    document.getElementById('conf-tickets').textContent = getTicketSummary();
    document.getElementById('conf-total').textContent = `$${calculateTotal().toFixed(2)} MXN`;
    document.getElementById('conf-name').textContent = document.getElementById('name').value || 'No proporcionado';
    document.getElementById('conf-email').textContent = document.getElementById('email').value || 'No proporcionado';
    document.getElementById('conf-code').textContent = codigoReserva || generateReservationCode();
}

// Calcular total
function calculateTotal() {
    let total = 0;
    for (const type in ticketCounts) {
        total += ticketCounts[type] * ticketPrices[type];
    }
    return total;
}

// Obtener resumen de boletos para confirmación
function getTicketSummary() {
    let summary = '';
    
    if (ticketCounts.adult > 0) {
        summary += `${ticketCounts.adult} Adulto${ticketCounts.adult > 1 ? 's' : ''}`;
    }
    
    if (ticketCounts.child > 0) {
        if (summary) summary += ', ';
        summary += `${ticketCounts.child} Niño${ticketCounts.child > 1 ? 's' : ''}`;
    }
    
    if (ticketCounts.senior > 0) {
        if (summary) summary += ', ';
        summary += `${ticketCounts.senior} Persona${ticketCounts.senior > 1 ? 's' : ''} Mayor${ticketCounts.senior > 1 ? 'es' : ''}`;
    }
    
    return summary || 'No hay boletos seleccionados';
}

// Generar código de reserva
function generateReservationCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

// Reiniciar el proceso de reserva
function resetReservation() {
    selectedMovieId = null;
    selectedMovieTitle = null;
    selectedShowtimeId = null;
    selectedShowtimeDate = null;
    selectedShowtimeTime = null;
    selectedShowtimeRoom = null;
    selectedRoomId = null;
    selectedRoomName = null;
    selectedSeats = [];
    
    ticketCounts = {
        adult: 0,
        child: 0,
        senior: 0
    };
    
    document.getElementById('adult-count').textContent = '0';
    document.getElementById('child-count').textContent = '0';
    document.getElementById('senior-count').textContent = '0';
    
    document.getElementById('ticket-details').innerHTML = '<p>No hay boletos seleccionados</p>';
    document.getElementById('total-amount').textContent = '0.00';
    
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('card-number').value = '';
    document.getElementById('expiry').value = '';
    document.getElementById('cvv').value = '';
    
    document.querySelectorAll('.movie-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    document.querySelectorAll('.showtime-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.querySelectorAll('.room-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.querySelectorAll('.seat').forEach(seat => {
        seat.classList.remove('selected');
    });
    
    liberarTodosAsientos();
    
    if (asientosVerificationInterval) {
        clearInterval(asientosVerificationInterval);
        asientosVerificationInterval = null;
    }
    
    updateSelectedSeatsDisplay();
}

// Liberar asientos cuando se cierra la pestaña
window.addEventListener('beforeunload', () => {
    liberarTodosAsientos();
    if (asientosVerificationInterval) {
        clearInterval(asientosVerificationInterval);
    }
});

// Agregar estilos CSS para la retroalimentación visual
const style = document.createElement('style');
style.textContent = `
    input.valid {
        border-color: #27ae60 !important;
        box-shadow: 0 0 5px rgba(39, 174, 96, 0.5);
    }
    
    input.invalid {
        border-color: #e74c3c !important;
        box-shadow: 0 0 5px rgba(231, 76, 60, 0.5);
    }
    
    .validation-message {
        font-size: 0.8rem;
        margin-top: 5px;
        min-height: 20px;
    }
    
    .btn-disabled {
        opacity: 0.6;
        cursor: not-allowed !important;
        background-color: #6c757d !important;
        border-color: #6c757d !important;
    }
    
    .btn-disabled:hover {
        transform: none !important;
        box-shadow: none !important;
    }
`;
document.head.appendChild(style);