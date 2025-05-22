document.addEventListener("DOMContentLoaded", init);

function init() {
  cargarCSV();
  configurarEventos();
}

let calles = [];
let viaSeleccionada = null;
let detallesInmueble = null;
let extrasSeleccionados = [];

function cargarCSV() {
  Papa.parse("/static/callejero/callejero.csv", {
    download: true,
    header: true,
    complete: function (results) {
      console.log("📄 CSV cargado:", results.data);
      calles = results.data.map((fila) => ({
        via: fila.NombreVia || "",
        codigo: fila.codigo || "",
        normalizada: normalizarTexto(fila.NombreVia || ""),
      }));
    },
  });
}

function configurarEventos() {
  const inputDireccion = document.getElementById("calle");
  const inputNumero = document.getElementById("numero");
  const btnConsultar = document.getElementById("consultar-principal");
  const botonesExtra = document.querySelectorAll(".btn-extra");
  const btnCalcValoracion = document.getElementById("calcular-valoracion");

  if (inputDireccion)
    inputDireccion.addEventListener("input", mostrarSugerencias);
  if (inputNumero)
    inputNumero.addEventListener("input", verificarMostrarCamposExtra);
  if (btnConsultar) btnConsultar.addEventListener("click", consultarCatastro);

  if (botonesExtra) {
    botonesExtra.forEach((btn) => {
      btn.addEventListener("click", function () {
        this.classList.toggle("seleccionado");

        const extra = this.dataset.extra;
        if (this.classList.contains("seleccionado")) {
          if (!extrasSeleccionados.includes(extra)) {
            extrasSeleccionados.push(extra);
          }
        } else {
          extrasSeleccionados = extrasSeleccionados.filter((e) => e !== extra);
        }
      });
    });
  }

  if (btnCalcValoracion) {
    btnCalcValoracion.addEventListener("click", calcularValoracion);
  }

  if (btnConsultar) btnConsultar.disabled = true;
}

function mostrarSugerencias() {
  const input = document.getElementById("calle");
  const contenedor = document.getElementById("resultados-catastro");
  contenedor.innerHTML = "";

  const valor = normalizarTexto(input.value.trim());
  if (valor.length < 2 || !calles.length) return;

  const palabras = valor.split(" ");
  const sugerencias = calles
    .filter((c) => palabras.every((p) => c.normalizada.includes(p)))
    .slice(0, 5);

  sugerencias.forEach((calle) => {
    const item = document.createElement("div");
    item.textContent = calle.via;
    item.className = "sugerencia";
    item.addEventListener("click", () => {
      input.value = calle.via;
      input.dataset.via = calle.via;
      input.dataset.codigo = calle.codigo;
      viaSeleccionada = calle;
      document.getElementById("consultar-principal").disabled = false;
      contenedor.innerHTML = "";
    });
    contenedor.appendChild(item);
  });
}

function verificarMostrarCamposExtra() {
  // No mostraremos los campos extra inicialmente, se usará directamente la tabla
  const direccion = document.getElementById("calle").value.trim();
  const numero = document.getElementById("numero").value.trim();

  // Habilitamos el botón de consultar si hay calle y número
  const btnConsultar = document.getElementById("consultar-principal");
  if (
    btnConsultar &&
    direccion &&
    numero &&
    document.getElementById("calle").dataset.codigo
  ) {
    btnConsultar.disabled = false;
  }
}

function consultarCatastro() {
  const via = document.getElementById("calle").dataset.via;
  const codigo = document.getElementById("calle").dataset.codigo;
  const numero = document.getElementById("numero").value.trim();

  if (!via || !codigo || !numero) {
    alert("Faltan datos para la consulta");
    return;
  }

  // Mostrar indicador de carga
  const btnConsultar = document.getElementById("consultar-principal");
  const originalText = btnConsultar.textContent;
  btnConsultar.textContent = "Consultando...";
  btnConsultar.disabled = true;

  fetch(
    `/api/catastro?via=${encodeURIComponent(via)}&numero=${numero}&codigo=${codigo}`,
  )
    .then((r) => r.json())
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        generarSelectoresDinamicos(data);
      } else {
        alert("No se encontraron inmuebles.");
      }
      btnConsultar.textContent = originalText;
      btnConsultar.disabled = false;
    })
    .catch(() => {
      alert("Error al conectar con Catastro");
      btnConsultar.textContent = originalText;
      btnConsultar.disabled = false;
    });
}

function generarSelectoresDinamicos(dataOriginal) {
  const div = document.getElementById("selectores-dinamicos");
  div.innerHTML = "";

  // Crear contenedor con la misma estética del desplegable de direcciones
  const inmueblesList = document.createElement("div");
  inmueblesList.classList.add("inmuebles-list");
  inmueblesList.style.backgroundColor = "#fff";
  inmueblesList.style.border = "1px solid #ccc";
  inmueblesList.style.borderRadius = "6px";
  inmueblesList.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
  inmueblesList.style.marginTop = "15px";
  inmueblesList.style.maxHeight = "350px";
  inmueblesList.style.overflowY = "auto";

  // Añadir cabecera con el título
  const cabecera = document.createElement("div");
  cabecera.style.padding = "10px 15px";
  cabecera.style.borderBottom = "1px solid #ddd";
  cabecera.style.backgroundColor = "#f8f8f8";
  cabecera.style.fontWeight = "bold";
  cabecera.style.display = "flex";
  cabecera.style.justifyContent = "space-between";
  cabecera.style.alignItems = "center";
  cabecera.innerHTML = `
    <div>Selecciona tu vivienda (${dataOriginal.length} encontrados)</div>
  `;
  inmueblesList.appendChild(cabecera);

  // Crear filas de inmuebles
  dataOriginal.forEach((inmueble, index) => {
    const item = document.createElement("div");
    item.classList.add("inmueble-item");
    item.style.padding = "12px 15px";
    item.style.borderBottom = "1px solid #eee";
    item.style.cursor = "pointer";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";

    // Primera parte: datos del inmueble
    let detalles = "";
    if (inmueble.bloque)
      detalles += `<strong>Bloque:</strong> ${inmueble.bloque} `;
    if (inmueble.escalera)
      detalles += `<strong>Esc:</strong> ${inmueble.escalera} `;
    if (inmueble.planta)
      detalles += `<strong>Planta:</strong> ${inmueble.planta} `;
    if (inmueble.puerta)
      detalles += `<strong>Puerta:</strong> ${inmueble.puerta}`;

    item.innerHTML = `
      <div style="flex: 1; text-align: left;">
        <div>${detalles}</div>
        <div style="color: #666; margin-top: 5px; font-size: 0.9em;">Ref: ${inmueble.refcat || "-"}</div>
      </div>
      <button class="btn-seleccionar" data-index="${index}">Seleccionar</button>
    `;

    // Hover effect
    item.addEventListener("mouseover", () => {
      item.style.backgroundColor = "#f4c542";
      item.style.color = "#333";
    });

    item.addEventListener("mouseout", () => {
      item.style.backgroundColor = "";
      item.style.color = "";
    });

    inmueblesList.appendChild(item);
  });

  div.appendChild(inmueblesList);

  // Añadir estilos para los botones
  const style = document.createElement("style");
  style.textContent = `
    .btn-seleccionar {
      background-color: #f4c542;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      color: #333;
    }
    .btn-seleccionar:hover {
      background-color: #af8d03;
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);

  // Añadir event listeners a los botones de seleccionar
  setTimeout(() => {
    const botones = document.querySelectorAll(".btn-seleccionar");
    botones.forEach((boton) => {
      boton.addEventListener("click", function () {
        const index = parseInt(this.dataset.index);
        const inmuebleSeleccionado = dataOriginal[index];

        if (inmuebleSeleccionado?.refcat) {
          // Mostrar indicador de carga
          this.innerHTML = "Cargando...";
          this.disabled = true;

          fetch(`/api/catastro?refcat=${inmuebleSeleccionado.refcat}`)
            .then((r) => r.json())
            .then((data) => {
              // Verificamos que data contenga resultados
              if (Array.isArray(data) && data.length > 0) {
                detallesInmueble = data[0];

                // Ocultar la lista de inmuebles después de seleccionar uno
                const listaInmuebles =
                  document.querySelector(".inmuebles-list");
                if (listaInmuebles) {
                  listaInmuebles.style.display = "none";
                }

                mostrarDetallesInmueble(data[0]);

                // Mostrar opciones adicionales
                document
                  .getElementById("extras-adicionales")
                  .classList.remove("oculto");
                document
                  .getElementById("resultado-valoracion")
                  .classList.remove("oculto");

                // Scroll suave a los extras
                const extrasAdicionales =
                  document.getElementById("extras-adicionales");
                extrasAdicionales.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              } else {
                // No se encontraron datos del inmueble
                alert(
                  "No se pudieron obtener los detalles del inmueble seleccionado. Por favor, intenta con otro inmueble.",
                );
              }
            })
            .catch((error) => {
              console.error("Error:", error);
              this.innerHTML = "Seleccionar";
              this.disabled = false;
              alert("Error al cargar los detalles del inmueble");
            });
        }
      });
    });
  }, 100);

  document.getElementById("formulario-segundo").classList.remove("oculto");
}

// La función confirmarInmueble ya no es necesaria porque ahora seleccionamos directamente de la tabla

function mostrarDetallesInmueble(bien) {
  const div = document.getElementById("detalles-inmueble");
  div.classList.remove("oculto");

  // Mostrar todos los campos disponibles del inmueble
  let direccionCompleta = "";
  if (bien.tipo_via) direccionCompleta += bien.tipo_via + " ";
  if (bien.nombre_via) direccionCompleta += bien.nombre_via + " ";
  if (bien.numero) direccionCompleta += bien.numero;

  // Opcional: completar dirección con resto de datos
  let direccionDetalle = "";
  if (bien.bloque) direccionDetalle += `Bloque ${bien.bloque}, `;
  if (bien.escalera) direccionDetalle += `Esc. ${bien.escalera}, `;
  if (bien.planta) direccionDetalle += `Planta ${bien.planta}, `;
  if (bien.puerta) direccionDetalle += `Puerta ${bien.puerta}`;

  if (direccionDetalle) {
    direccionCompleta += ` (${direccionDetalle})`;
  }

  // Reorganizamos todos los datos catastrales
  const datosCatastrales = [
    { nombre: "Referencia Catastral", valor: bien.refcat || "No disponible" },
    { nombre: "Localización", valor: direccionCompleta || "No disponible" },
    { nombre: "Clase", valor: bien.clase || "No disponible" },
    { nombre: "Uso principal", valor: bien.uso || "No disponible" },
    {
      nombre: "Superficie",
      valor: bien.superficie ? `${bien.superficie} m²` : "No disponible",
    },
    { nombre: "Año construcción", valor: bien.anio || "No disponible" },
    { nombre: "Planta", valor: bien.planta || "No disponible" },
    { nombre: "Puerta", valor: bien.puerta || "No disponible" },
    { nombre: "Código Postal", valor: bien.cp || "No disponible" },
  ];

  // Creamos una presentación en formato de lista horizontal para los datos catastrales
  div.innerHTML = `
    <h3>Datos Catastrales del Inmueble</h3>
    
    <div class="datos-catastro-lista">
      ${datosCatastrales
        .map(
          (campo) => `
        <div class="dato-catastral">
          <span class="campo-label">${campo.nombre}:</span>
          <span class="campo-valor">${campo.valor}</span>
        </div>
      `,
        )
        .join("")}
    </div>
    
    <div class="instrucciones-valoracion">
      <p>Para obtener una valoración más precisa, indica las características adicionales de tu inmueble.</p>
    </div>
  `;

  // Añadir estilos inline para la presentación de los datos catastrales
  const style = document.createElement("style");
  style.textContent = `
    /* Estilos para los datos catastrales en formato de lista */
    .datos-catastro-lista {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 15px 0;
      background-color: #fff9e6;
      border-radius: 8px;
      padding: 15px;
      border: 1px solid #f4e8c1;
    }
    
    
    .dato-catastral {
      flex: 1 1 auto;
      min-width: 180px;
      display: flex;
      align-items: baseline;
      padding: 4px 8px;
      font-size: 0.85rem;
      background-color: #fffdf5;
      border-radius: 4px;
      margin: 2px;
    }
    
    .campo-label {
      font-weight: 600;
      font-size: 0.75rem;
      color: #666;
      margin-right: 5px;
    }
    
    .campo-valor {
      font-size: 0.85rem;
      color: #333;
      word-break: break-word;
    }
    
    /* Estilos para las características adicionales en tres columnas */
    .extras-grid {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 15px;
    }
    
    /* Características adicionales en dos columnas */
    .extras-adicionales-grid {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 15px;
    }
    
    .instrucciones-valoracion {
      margin-top: 25px;
      padding: 15px;
      background-color: #fcf8e3;
      border-left: 4px solid #f4c542;
      border-radius: 4px;
    }
    
    .instrucciones-valoracion p {
      margin: 0;
      color: #8a6d3b;
    }
    
    /* Media queries para pantallas pequeñas */
    @media (max-width: 768px) {
      .datos-catastro-container {
        flex-direction: column;
      }
      
      .extras-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .extras-adicionales-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 480px) {
      .extras-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);

  // Pre-seleccionar características basadas en los datos catastrales
  if (bien.uso && bien.uso.toLowerCase().includes("vivienda")) {
    document.querySelector("select#tipo-propiedad").value = "piso";
  } else if (bien.uso && bien.uso.toLowerCase().includes("almacén")) {
    document.querySelector("select#tipo-propiedad").value = "otros";
  }
}

function calcularValoracion() {
  if (!detallesInmueble) {
    alert("Primero debes seleccionar un inmueble");
    return;
  }

  fetch("/api/user", {
    method: "GET",
    credentials: "include"
  })
  .then((response) => {
    if (!response.ok) throw new Error("Usuario no autenticado");
    return response.json();
  })
  .then(() => {
    realizarValoracion();
  })
  .catch(() => {
    mostrarModalRegistro();
  });
}


function mostrarModalRegistro() {
  // Creamos el modal de registro
  const modal = document.createElement('div');
  modal.className = 'modal-registro';
  modal.id = 'modal-registro';
  
  modal.innerHTML = `
    <div class="modal-contenido">
      <div class="modal-cabecera">
        <h3>Crea tu perfil para guardar la valoración</h3>
        <span class="cerrar-modal">&times;</span>
      </div>
      <div class="modal-cuerpo">
        <p>Para recibir tu valoración y guardarla en tu perfil, necesitamos que te registres:</p>
        <form id="form-registro" class="form-registro">
          <div class="campo-formulario">
            <label for="nombre-registro">Nombre:</label>
            <input type="text" id="nombre-registro" required placeholder="Tu nombre">
          </div>
          <div class="campo-formulario">
            <label for="telefono-registro">Teléfono:</label>
            <input type="tel" id="telefono-registro" required placeholder="612345678">
          </div>
          <div class="campo-formulario">
            <label for="password-registro">Contraseña:</label>
            <input type="password" id="password-registro" required placeholder="Mínimo 6 caracteres">
          </div>
          <button type="submit" class="btn-principal">Ver valoración</button>
        </form>
        <div class="login-link">
          <p>¿Ya tienes cuenta? <a href="#" onclick="mostrarModalLogin(); return false;">Inicia sesión</a></p>
        </div>
      </div>
    </div>
  `;
  
  // Añadimos el modal al body
  document.body.appendChild(modal);
  
  // Mostramos el modal con una transición
  setTimeout(() => {
    modal.style.opacity = "1";
  }, 10);
  
  // Cerrar modal al hacer clic en la X
  const cerrarModal = modal.querySelector('.cerrar-modal');
  cerrarModal.addEventListener('click', () => {
    cerrarModalRegistro();
  });
  
  // Cerrar al hacer clic fuera del contenido
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cerrarModalRegistro();
    }
  });
  
  // Manejar envío del formulario
  const formRegistro = document.getElementById('form-registro');
  if (formRegistro) {
    formRegistro.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Validación básica - Comprobamos que existan los elementos antes de acceder a ellos
      const nombreElement = document.getElementById('nombre-registro');
      const telefonoElement = document.getElementById('telefono-registro');
      const passwordElement = document.getElementById('password-registro');
      
      if (!nombreElement || !telefonoElement || !passwordElement) {
        console.error("Alguno de los campos del formulario no fue encontrado");
        alert("Error: No se pudieron encontrar todos los campos del formulario");
        return;
      }
      
      const nombre = nombreElement.value;
      const telefono = telefonoElement.value;
      const password = passwordElement.value;
      
      // Enviar datos de registro y proceder con la valoración
      registrarUsuarioYValorar(nombre, telefono, password);
    });
  } else {
    console.error("Elemento form-registro no encontrado");
  }
}

function cerrarModalRegistro() {
  const modal = document.getElementById('modal-registro');
  if (modal) {
    modal.style.opacity = "0";
    setTimeout(() => {
      try {
        document.body.removeChild(modal);
      } catch (error) {
        console.error("Error al eliminar el modal:", error);
        // Si falla removeChild, intentamos ocultar el modal como alternativa
        modal.style.display = "none";
      }
    }, 300);
  } else {
    console.warn("Modal de registro no encontrado al intentar cerrarlo");
  }
}

function mostrarModalLogin() {
  // Cerrar modal de registro si está abierto
  cerrarModalRegistro();
  
  // Crear modal de login (similar al de registro)
  const modal = document.createElement('div');
  modal.className = 'modal-registro';
  modal.id = 'modal-login';
  
  modal.innerHTML = `
    <div class="modal-contenido">
      <div class="modal-cabecera">
        <h3>Inicia sesión</h3>
        <span class="cerrar-modal">&times;</span>
      </div>
      <div class="modal-cuerpo">
        <form id="form-login" class="form-registro">
          <div class="campo-formulario">
            <label for="telefono-login">Teléfono:</label>
            <input type="tel" id="telefono-login" required placeholder="612345678">
          </div>
          <div class="campo-formulario">
            <label for="password-login">Contraseña:</label>
            <input type="password" id="password-login" required placeholder="Tu contraseña">
          </div>
          <button type="submit" class="btn-principal">Iniciar sesión</button>
        </form>
        <div class="login-link">
          <p>¿No tienes cuenta? <a href="#" onclick="cerrarModalLogin(); mostrarModalRegistro(); return false;">Regístrate</a></p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    modal.style.opacity = "1";
  }, 10);
  
  const cerrarModal = modal.querySelector('.cerrar-modal');
  cerrarModal.addEventListener('click', () => {
    cerrarModalLogin();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cerrarModalLogin();
    }
  });
  
  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const telefonoElement = document.getElementById('telefono-login');
      const passwordElement = document.getElementById('password-login');
      
      if (!telefonoElement || !passwordElement) {
        console.error("No se encontraron los campos del formulario de login");
        alert("Error: No se pudieron encontrar todos los campos del formulario");
        return;
      }
      
      const telefono = telefonoElement.value;
      const password = passwordElement.value;
      
      // Iniciar sesión y proceder con valoración
      loginUsuarioYValorar(telefono, password);
    });
  } else {
    console.error("No se encontró el formulario de login");
  }
}

function cerrarModalLogin() {
  const modal = document.getElementById('modal-login');
  if (modal) {
    modal.style.opacity = "0";
    setTimeout(() => {
      try {
        document.body.removeChild(modal);
      } catch (error) {
        console.error("Error al eliminar el modal de login:", error);
        // Si falla removeChild, intentamos ocultar el modal como alternativa
        modal.style.display = "none";
      }
    }, 300);
  } else {
    console.warn("Modal de login no encontrado al intentar cerrarlo");
  }
}

function registrarUsuarioYValorar(nombre, telefono, password) {
  const datosRegistro = {
    username: nombre,
    phone: telefono,
    password: password
  };

  fetch("/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datosRegistro),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error en el registro');
    }
    return response.json();
  })
  .then(data => {
    cerrarModalRegistro();

    // Realizar valoración una vez registrado
    realizarValoracion(); // esto ya guarda en la BD si el usuario está autenticado

    // Redirigir al dashboard después de un breve retraso para asegurar que se guarda
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 4000);
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error al registrarse: ' + error.message);
  });
}



function loginUsuarioYValorar(telefono, password) {
  // Datos de login
  const datosLogin = {
    phone: telefono,
    password: password
  };
  
  // Enviar datos de login al servidor
  fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datosLogin),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error en el inicio de sesión');
    }
    return response.json();
  })
  .then(data => {
    cerrarModalLogin();
    // Después de iniciar sesión correctamente, redirigimos al dashboard
    window.location.href = '/dashboard';
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error al iniciar sesión: ' + error.message);
  });
}

function realizarValoracion() {
  // Verificamos que detallesInmueble exista antes de continuar
  if (!detallesInmueble || !detallesInmueble.refcat) {
    console.error("No hay información del inmueble para valorar");
    alert("Error: Primero debe buscar y seleccionar un inmueble para valorar");
    return;
  }

  // Si no hay elementos de formulario, usar valores predeterminados
  // Esto permite que la valoración continúe incluso si faltan elementos
  let estadoConservacion = "normal";
  let tipoPropiedad = "piso";
  let habitaciones = "3";
  let banos = "1";
  
  // Intentar obtener valores de los campos si existen
  const estadoConservacionElement = document.getElementById("estado-conservacion");
  const tipoPropiedadElement = document.getElementById("tipo-propiedad");
  const habitacionesElement = document.getElementById("habitaciones");
  const banosElement = document.getElementById("baños");
  
  // Si los elementos existen, usamos sus valores
  if (estadoConservacionElement) {
    estadoConservacion = estadoConservacionElement.value;
  }
  
  if (tipoPropiedadElement) {
    tipoPropiedad = tipoPropiedadElement.value;
  }
  
  if (habitacionesElement) {
    habitaciones = habitacionesElement.value;
  }
  
  if (banosElement) {
    banos = banosElement.value;
  }

  // Obtener la dirección completa para determinar el barrio
  let direccionCompleta = '';
  if (detallesInmueble.tipo_via) direccionCompleta += detallesInmueble.tipo_via + ' ';
  if (detallesInmueble.nombre_via) direccionCompleta += detallesInmueble.nombre_via + ' ';
  if (detallesInmueble.numero) direccionCompleta += detallesInmueble.numero;
  
  // Añadimos información detallada para una dirección más completa
  if (detallesInmueble.bloque || detallesInmueble.escalera || detallesInmueble.planta || detallesInmueble.puerta) {
    direccionCompleta += " (";
    if (detallesInmueble.bloque) direccionCompleta += `Bloque ${detallesInmueble.bloque}, `;
    if (detallesInmueble.escalera) direccionCompleta += `Esc. ${detallesInmueble.escalera}, `;
    if (detallesInmueble.planta) direccionCompleta += `Planta ${detallesInmueble.planta}, `;
    if (detallesInmueble.puerta) direccionCompleta += `Puerta ${detallesInmueble.puerta}`;
    direccionCompleta += ")";
  }
  
  // Validar los extras seleccionados para asegurarse de que son un array
  let extrasEnviar = extrasSeleccionados;
  if (!Array.isArray(extrasEnviar)) {
    extrasEnviar = [];
  }
  
  const datos = {
    ref_catastral: detallesInmueble.refcat, 
    superficie: detallesInmueble.superficie || 0,
    anio: detallesInmueble.anio || 2000,
    estado: estadoConservacion,
    tipo: tipoPropiedad,
    habitaciones: habitaciones,
    banos: banos,
    extras: extrasEnviar,
    direccion: direccionCompleta  // Incluimos la dirección para determinar el barrio
  };

  fetch("/api/valoracion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(datos),
  })
    .then((response) => response.json())
    .then((data) => {
      const divResultado = document.getElementById("valor-estimado");
      divResultado.innerHTML = `
      <h3>Valoración estimada:</h3>
      <div class="horquilla-precios">
        <div class="precio-min">
          <span class="precio-label">Mínimo</span>
          <span class="precio-valor">${data.precio_min}</span>
        </div>
        <div class="precio-recomendado">
          <span class="precio-label">Recomendado</span>
          <span class="precio-valor">${data.precio_total}</span>
        </div>
        <div class="precio-max">
          <span class="precio-label">Máximo</span>
          <span class="precio-valor">${data.precio_max}</span>
        </div>
      </div>
      <div class="precio-m2">${data.precio_m2} por metro cuadrado</div>
      <div class="factores-valoracion">
        <p>Factores aplicados en la valoración:</p>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Barrio:</strong> ${data.factores.barrio} (${data.factores.precio_base})</li>
          <li><strong>Antigüedad:</strong> ${data.factores.antigüedad}</li>
          <li><strong>Estado de conservación:</strong> ${data.factores.estado}</li>
          <li><strong>Tipo de inmueble:</strong> ${data.factores.tipo}</li>
          <li><strong>Habitaciones:</strong> ${data.factores.habitaciones}</li>
          <li><strong>Baños:</strong> ${data.factores.baños}</li>
          <li><strong>Extras:</strong> ${data.factores.extras}</li>
          ${data.factores.vista_alegre !== '1.00' ? `<li><strong>Incremento Vista Alegre:</strong> ${data.factores.vista_alegre}</li>` : ''}
        </ul>
      </div>
    `;
    
    // Añadir estilos CSS para la horquilla de precios
    const style = document.createElement("style");
    style.textContent = `
      .horquilla-precios {
        display: flex;
        justify-content: space-between;
        margin: 20px 0;
        text-align: center;
      }
      
      .precio-min, .precio-recomendado, .precio-max {
        display: flex;
        flex-direction: column;
        padding: 10px;
        border-radius: 8px;
      }
      
      .precio-min {
        background-color: #f8f9fa;
        color: #6c757d;
      }
      
      .precio-recomendado {
        background-color: #e7f5ff;
        color: #0d6efd;
        transform: scale(1.1);
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1;
        font-weight: bold;
      }
      
      .precio-max {
        background-color: #f8f9fa;
        color: #6c757d;
      }
      
      .precio-label {
        font-size: 0.8em;
        margin-bottom: 5px;
        font-weight: 600;
      }
      
      .precio-valor {
        font-size: 1.4em;
      }
      
      .precio-m2 {
        text-align: center;
        color: #6c757d;
        margin-bottom: 20px;
      }
      
      .factores-valoracion {
        margin-top: 15px;
        font-size: 0.8em;
        color: #777;
        background-color: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
      }
    `;
    document.head.appendChild(style);
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("Error al calcular la valoración");
    });
}

function normalizarTexto(texto) {
  return texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function abrirDashboard() {
  window.location.href = "/dashboard";
}
