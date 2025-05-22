document.addEventListener('DOMContentLoaded', function() {
  // Conseguir todos los botones "Quiero vender mi casa"
  var botones = document.querySelectorAll('.btn-quiero-vender');
  
  // Añadir evento clic a cada botón
  botones.forEach(function(boton) {
    boton.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('Botón de venta clickeado');
      
      // Llamar a la API para togglear el estado
      fetch('/api/toggle-wants-to-sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (data.success) {
          // Mostrar mensaje
          alert('Gracias, nos pondremos en contacto contigo.');
          
          // Cambiar texto de todos los botones
          botones.forEach(function(btn) {
            if (data.wants_to_sell) {
              btn.innerHTML = '<span class="check-icon">✓</span> Te llamaremos';
            } else {
              btn.innerHTML = '¡Quiero vender mi casa!';
            }
          });
        } else {
          alert('Error al procesar la solicitud');
        }
      })
      .catch(function(error) {
        console.error('Error:', error);
        alert('Error al procesar la solicitud');
      });
    });
  });
});