// Manejo del menú de perfil y formularios de perfil y contraseña

window.addEventListener("DOMContentLoaded", () => {
  const btnPerfil = document.getElementById("btn-perfil");
  const menuPerfil = document.getElementById("menu-perfil");
  const editarPerfilBtn = document.getElementById("editar-perfil");
  const cambiarPasswordBtn = document.getElementById("cambiar-password");
  const botonesQuieroVender = document.querySelectorAll(".btn-quiero-vender");

  const seccionPrincipal = document.querySelector(".bloque-principal");
  const seccionEditar = document.getElementById("seccion-editar");
  const seccionPassword = document.getElementById("seccion-password");

  const formEditarPerfil = document.getElementById("form-editar-perfil");
  const formCambiarPassword = document.getElementById("form-cambiar-password");

  const mensajeExito = document.getElementById("mensaje-exito");
  const mensajeExitoPassword = document.getElementById("mensaje-exito-password");

  // Mostrar/ocultar el menú de perfil
  if (btnPerfil && menuPerfil) {
    btnPerfil.addEventListener("click", (e) => {
      e.stopPropagation();
      menuPerfil.classList.toggle("oculto");
    });

    document.addEventListener("click", (e) => {
      if (!btnPerfil.contains(e.target) && !menuPerfil.contains(e.target)) {
        menuPerfil.classList.add("oculto");
      }
    });
  }

  // Mostrar sección Editar Perfil
  if (editarPerfilBtn && seccionPrincipal && seccionEditar) {
    editarPerfilBtn.addEventListener("click", (e) => {
      e.preventDefault();
      seccionPrincipal.classList.add("oculto");
      seccionEditar.classList.remove("oculto");
      seccionPassword?.classList.add("oculto");
      menuPerfil?.classList.add("oculto");
    });
  }

  // Mostrar sección Cambiar Contraseña
  if (cambiarPasswordBtn && seccionPrincipal && seccionPassword) {
    cambiarPasswordBtn.addEventListener("click", (e) => {
      e.preventDefault();
      seccionPrincipal.classList.add("oculto");
      seccionEditar?.classList.add("oculto");
      seccionPassword.classList.remove("oculto");
      menuPerfil?.classList.add("oculto");
    });
  }

  // Envío del formulario de edición de perfil
  if (formEditarPerfil) {
    formEditarPerfil.addEventListener("submit", (e) => {
      e.preventDefault();

      const username = document.getElementById("nombre").value;
      const phone = document.getElementById("telefono").value;

      fetch("/api/update_profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, phone }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            alert(data.error);
            return;
          }

          mensajeExito?.classList.remove("oculto");

          setTimeout(() => {
            mensajeExito?.classList.add("oculto");
            seccionEditar?.classList.add("oculto");
            seccionPrincipal?.classList.remove("oculto");
            formEditarPerfil.reset();
          }, 2000);
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("Error al actualizar el perfil");
        });
    });
  }

  // Envío del formulario de cambio de contraseña
  if (formCambiarPassword) {
    formCambiarPassword.addEventListener("submit", (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById("current-password").value;
      const newPassword = document.getElementById("new-password").value;

      fetch("/api/change_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            alert(data.error);
            return;
          }

          mensajeExitoPassword?.classList.remove("oculto");

          setTimeout(() => {
            mensajeExitoPassword?.classList.add("oculto");
            seccionPassword?.classList.add("oculto");
            seccionPrincipal?.classList.remove("oculto");
            formCambiarPassword.reset();
          }, 2000);
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("Error al cambiar la contraseña");
        });
    });
  }
  
  // Manejo de los botones "Quiero vender mi casa"
  if (botonesQuieroVender && botonesQuieroVender.length > 0) {
    botonesQuieroVender.forEach(boton => {
      boton.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Botón 'Quiero vender mi casa' clickeado");
        
        // Hacer petición al servidor para cambiar el estado
        fetch("/api/toggle-wants-to-sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Actualizar todos los botones con el nuevo estado
            const textoBtn = data.wants_to_sell ? 
              '<span class="check-icon">✓</span> Listado para venta' : 
              '¡Quiero vender mi casa!';
              
            botonesQuieroVender.forEach(btn => {
              btn.innerHTML = textoBtn;
            });
            
            // Mostrar el mensaje de confirmación
            const mensaje = data.wants_to_sell ? 
              'Gracias, nos pondremos en contacto contigo.' : 
              'Has cancelado la opción de venta.';
              
            alert(mensaje);
          } else {
            alert("Hubo un error al procesar tu solicitud. Inténtalo de nuevo.");
          }
        })
        .catch(error => {
          console.error("Error:", error);
          alert("Error al procesar la solicitud");
        });
      });
    });
  }
});
