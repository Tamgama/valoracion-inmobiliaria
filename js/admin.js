document.addEventListener('DOMContentLoaded', function() {
    // Funcionalidad para confirmar eliminación de usuario (si se implementa)
    const deleteButtons = document.querySelectorAll('.btn-delete');
    if (deleteButtons) {
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
                    e.preventDefault();
                }
            });
        });
    }

    // Funcionalidad para alternar secciones (si se implementa)
    const tabButtons = document.querySelectorAll('.tab-button');
    if (tabButtons) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const targetId = this.dataset.target;
                
                // Ocultar todas las secciones
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                
                // Mostrar la sección seleccionada
                document.getElementById(targetId).style.display = 'block';
                
                // Actualizar botones activos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
});