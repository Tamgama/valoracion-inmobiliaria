# valoracion-inmobiliaria

# 🏠 Plataforma de Valoración y Gestión Inmobiliaria

Este proyecto es una plataforma web desarrollada para la valoración y gestión de propiedades inmobiliarias. Permite a los usuarios registrar inmuebles, obtener valoraciones automáticas basadas en datos reales y acceder a un panel personalizado con funcionalidades tipo **CRM/ERP**.

---

## 🚀 Funcionalidades principales

- ✅ Registro e inicio de sesión de usuarios
- 🏡 Formulario inteligente de valoración con datos catastrales reales
- 📊 Panel de usuario con histórico de valoraciones
- 🔐 Gestión segura de datos personales (sin compartir con terceros)
- 🗂️ Estructura preparada para módulos adicionales (ERP, firma digital, etc.)

---

## 🛠️ Tecnologías utilizadas

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Python, Flask  
- **Base de datos:** SQLite + SQLAlchemy  
- **APIs:** Catastro (scraping y REST), Google Places  
- **Entorno:** Replit

---

## ⚖️ Política de privacidad

Esta plataforma recoge datos personales necesarios para el uso de sus servicios, como nombre, email y teléfono. No se comparten con terceros.  
Cumple con el **RGPD** y la **LOPDGDD**.

---

## 📂 Estructura del proyecto

- /static → Archivos estáticos (CSS, JS, imágenes)
- /templates → Plantillas HTML con Jinja2
- /app.py → Lógica principal del servidor Flask
- /models.py → Definición de las tablas de la base de datos
- /forms/ → Formularios de entrada de datos
- /utils/ → Funciones auxiliares (Catastro, validaciones, etc.)
