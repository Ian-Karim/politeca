// Variables globales para almacenar el estado de la reserva
let selectedMovieId = null;
let selectedMovieTitle = null;
let selectedShowtimeId = null;
let selectedShowtimeDate = null;
let selectedShowtimeTime = null;
let selectedShowtimeRoom = null;
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

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    initializeSeats();
    loadMovies(); // Cargar películas desde la base de datos
});

// Inicializar todos los event listeners
function initializeEventListeners() {
    // Navegación entre pestañas
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Botones de navegación
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.next));
    });

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

    // Finalizar reserva
    document.querySelector('[data-next="confirmacion"]').addEventListener('click', (e) => {
        e.preventDefault();
        completeReservation();
    });
}

// Cargar películas desde la base de datos
async function loadMovies() {
    try {
        const response = await fetch('php/get_movies.php');
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
            
            movieGrid.appendChild(movieCard);
        });
        
        // Añadir event listeners a las nuevas tarjetas de película
        document.querySelectorAll('.movie-card').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = card.dataset.movie;
                const movieTitle = card.querySelector('.movie-title').textContent;
                selectMovie(movieId, movieTitle);
            });
        });
    } catch (error) {
        console.error('Error al cargar películas:', error);
        // En caso de error, mantener las películas predeterminadas
    }
}

// Seleccionar una película
function selectMovie(movieId, movieTitle) {
    selectedMovieId = movieId;
    selectedMovieTitle = movieTitle;
    
    // Actualizar la UI
    document.getElementById('selected-movie').textContent = movieTitle;
    
    // Cargar funciones para esta película
    loadShowtimes(movieId);
}

// Cargar funciones desde la base de datos
async function loadShowtimes(movieId) {
    try {
        const response = await fetch(`php/get_showtimes.php?movie_id=${movieId}`);
        const showtimes = await response.json();
        
        const showtimesContainer = document.querySelector('#funcion-content .showtimes');
        showtimesContainer.innerHTML = '';
        
        showtimes.forEach(showtime => {
            const date = new Date(showtime.fecha + 'T' + showtime.hora);
            const formattedDate = date.toLocaleDateString('es-ES', { 
                weekday: 'short', 
                day: 'numeric' 
            });
            const formattedTime = date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            const button = document.createElement('button');
            button.className = 'showtime-btn';
            button.dataset.showtime = showtime.id;
            button.textContent = `${formattedDate} - ${formattedTime}`;
            
            button.addEventListener('click', () => {
                selectShowtime(showtime.id, formattedDate, formattedTime, showtime.sala_nombre);
            });
            
            showtimesContainer.appendChild(button);
        });
    } catch (error) {
        console.error('Error al cargar funciones:', error);
    }
}

// Seleccionar una función
function selectShowtime(showtimeId, date, time, room) {
    selectedShowtimeId = showtimeId;
    selectedShowtimeDate = date;
    selectedShowtimeTime = time;
    selectedShowtimeRoom = room;
    
    // Actualizar la UI
    document.getElementById('selected-showtime').textContent = `${date} - ${time}`;
    document.getElementById('selected-room').textContent = room;
    
    // Cargar asientos para esta función
    loadSeats(showtimeId);
}

// Cargar asientos desde la base de datos
async function loadSeats(showtimeId) {
    try {
        const response = await fetch(`php/get_seats.php?function_id=${showtimeId}`);
        const data = await response.json();
        
        const seatsGrid = document.getElementById('seats-grid');
        seatsGrid.innerHTML = '';
        
        // Organizar asientos por fila
        const seatsByRow = {};
        data.asientos.forEach(seat => {
            if (!seatsByRow[seat.fila]) {
                seatsByRow[seat.fila] = [];
            }
            seatsByRow[seat.fila].push(seat);
        });
        
        // Crear interfaz de asientos
        for (const row in seatsByRow) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'seat-row';
            
            seatsByRow[row].sort((a, b) => a.numero - b.numero).forEach(seat => {
                const seatButton = document.createElement('button');
                seatButton.className = 'seat';
                seatButton.dataset.seatId = seat.id;
                seatButton.textContent = seat.numero;
                
                // Marcar asientos ocupados
                if (data.ocupados.includes(seat.id)) {
                    seatButton.classList.add('occupied');
                    seatButton.disabled = true;
                }
                
                seatButton.addEventListener('click', () => toggleSeatSelection(seatButton));
                rowDiv.appendChild(seatButton);
            });
            
            seatsGrid.appendChild(rowDiv);
        }
    } catch (error) {
        console.error('Error al cargar asientos:', error);
    }
}

// Cambiar entre pestañas
function switchTab(tabName) {
    // Ocultar todos los contenidos de pestañas
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Mostrar la pestaña seleccionada
    document.getElementById(`${tabName}-content`).classList.add('active');
    
    // Actualizar pestañas activas
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Actualizar información según la pestaña
    if (tabName === 'asientos') {
        document.getElementById('tickets-count').textContent = 
            ticketCounts.adult + ticketCounts.child + ticketCounts.senior;
    }
}

// Inicializar asientos
function initializeSeats() {
    const seatsGrid = document.getElementById('seats-grid');
    seatsGrid.innerHTML = '';
    
    // Crear 8 filas (A-H) con 10 asientos cada una
    for (let row = 0; row < 8; row++) {
        const rowLetter = String.fromCharCode(65 + row);
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        
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

// Alternar selección de asiento
function toggleSeatSelection(seat) {
    const seatId = seat.dataset.seatId || seat.dataset.seat;
    
    if (seat.classList.contains('selected')) {
        seat.classList.remove('selected');
        selectedSeats = selectedSeats.filter(s => s !== seatId);
    } else {
        const totalTickets = ticketCounts.adult + ticketCounts.child + ticketCounts.senior;
        
        if (selectedSeats.length < totalTickets) {
            seat.classList.add('selected');
            selectedSeats.push(seatId);
        } else {
            alert(`Solo puedes seleccionar ${totalTickets} asientos para los boletos que elegiste.`);
        }
    }
    
    updateSelectedSeatsDisplay();
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

// Obtener o crear usuario (simulado)
async function getOrCreateUser(name, email) {
    // En una implementación real, aquí harías una llamada a la API
    // Para este ejemplo, devolvemos un ID simulado
    return 1;
}

// Función para finalizar la reserva
async function completeReservation() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    
    // Validar campos
    if (!name || !email) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }
    
    // Validar información de pago (simulada)
    const cardNumber = document.getElementById('card-number').value;
    const expiry = document.getElementById('expiry').value;
    const cvv = document.getElementById('cvv').value;
    
    if (!cardNumber || !expiry || !cvv) {
        alert('Por favor, completa toda la información de pago.');
        return;
    }
    
    // Aquí deberías tener un sistema de usuarios real
    // Por ahora usaremos un usuario temporal
    const userId = await getOrCreateUser(name, email);
    
    const reservationData = {
        funcion_id: selectedShowtimeId,
        usuario_id: userId,
        boletos: [
            {
                tipo: 'adulto',
                cantidad: ticketCounts.adult,
                precio: ticketPrices.adult,
                asientos: selectedSeats.slice(0, ticketCounts.adult)
            },
            {
                tipo: 'niño',
                cantidad: ticketCounts.child,
                precio: ticketPrices.child,
                asientos: selectedSeats.slice(
                    ticketCounts.adult,
                    ticketCounts.adult + ticketCounts.child
                )
            },
            {
                tipo: 'senior',
                cantidad: ticketCounts.senior,
                precio: ticketPrices.senior,
                asientos: selectedSeats.slice(
                    ticketCounts.adult + ticketCounts.child
                )
            }
        ]
    };
    
    try {
        const response = await fetch('php/create_reservation.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reservationData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Actualizar la confirmación con los datos de la reserva
            document.getElementById('conf-movie').textContent = selectedMovieTitle;
            document.getElementById('conf-showtime').textContent = `${selectedShowtimeDate} - ${selectedShowtimeTime}`;
            document.getElementById('conf-room').textContent = selectedShowtimeRoom;
            document.getElementById('conf-seats').textContent = selectedSeats.join(', ');
            document.getElementById('conf-tickets').textContent = getTicketSummary();
            document.getElementById('conf-total').textContent = `$${result.total.toFixed(2)} MXN`;
            document.getElementById('conf-name').textContent = name;
            document.getElementById('conf-email').textContent = email;
            document.getElementById('conf-code').textContent = result.codigo_reserva;
            
            // Mostrar pantalla de confirmación
            switchTab('confirmacion');
        } else {
            alert('Error al crear la reserva: ' + result.error);
        }
    } catch (error) {
        console.error('Error al crear reserva:', error);
        alert('Error al crear la reserva');
    }
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
    
    return summary;
}

// Reiniciar el proceso de reserva
function resetReservation() {
    selectedMovieId = null;
    selectedMovieTitle = null;
    selectedShowtimeId = null;
    selectedShowtimeDate = null;
    selectedShowtimeTime = null;
    selectedShowtimeRoom = null;
    selectedSeats = [];
    
    ticketCounts = {
        adult: 0,
        child: 0,
        senior: 0
    };
    
    // Reiniciar UI
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
    
    // Reiniciar asientos
    document.querySelectorAll('.seat').forEach(seat => {
        seat.classList.remove('selected');
    });
    
    updateSelectedSeatsDisplay();
}