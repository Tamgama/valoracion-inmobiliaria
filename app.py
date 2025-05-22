import os
import logging
from flask import Flask, session, redirect, url_for, render_template, request, jsonify, flash
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
import catastro

# Configure logging
logging.basicConfig(level=logging.DEBUG)


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
# create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1,
                        x_host=1)  # needed for url_for to generate with https

# Configure the database - using SQLite for reliability
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///property_valuation.db"
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
# initialize the app with the extension
db.init_app(app)

# Initialize login manager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

with app.app_context():
    # Make sure to import the models here or their tables won't be created
    import models  # noqa: F401
    from models import Admin
    from werkzeug.security import generate_password_hash

    db.create_all()
    
    # Create admin user if it doesn't exist
    admin = Admin.query.filter_by(username='admin').first()
    if not admin:
        admin = Admin(
            username='admin',
            password_hash=generate_password_hash('admin123')
        )
        db.session.add(admin)
        db.session.commit()
        print("✅ Admin user created successfully. Username: admin, Password: admin123")


@login_manager.user_loader
def load_user(user_id):
    # Check if this is an admin login (admin_id starts with 'admin_')
    if isinstance(user_id, str) and user_id.startswith('admin_'):
        from models import Admin
        admin_id = int(user_id.split('_')[1])
        return Admin.query.get(admin_id)
    else:
        from models import User
        return User.query.get(int(user_id))
        
# Create an admin-required decorator
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not isinstance(current_user, Admin):
            return redirect(url_for('admin_login'))
        return f(*args, **kwargs)
    return decorated_function


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/politica-privacidad')
def politica_privacidad():
    return render_template('politica_privacidad.html')


@app.route('/politica-cookies')
def politica_cookies():
    return render_template('politica_cookies.html')


@app.route('/terminos-condiciones')
def terminos_condiciones():
    return render_template('terminos_condiciones.html')


@app.route('/dashboard')
@login_required
def dashboard():
    from models import PropertyValuation

    # Obtener las valoraciones del usuario ordenadas por fecha de creación (más reciente primero)
    all_valuations = PropertyValuation.query.filter_by(
        user_id=current_user.id).order_by(
            PropertyValuation.created_at.desc()).all()

    print(f"🔍 Usuario: {current_user.username} ({current_user.id})")
    print(f"📊 Valoraciones encontradas: {len(all_valuations)}")
    for v in all_valuations:
        print(
            f"• {v.address} → {v.estimated_value}€ ({v.created_at.strftime('%d/%m/%Y')})"
        )

    # Preparar los datos de todas las valoraciones para mostrar
    valuations_data = []
    for valuation in all_valuations:
        valuations_data.append({
            'id': valuation.id,
            'direccion': valuation.address,
            'ref_catastral': valuation.ref_catastral,
            'superficie': valuation.surface_area,
            'tipo': valuation.property_type,
            'clase': 'Residencial',  # Valor por defecto
            'uso': 'Vivienda',       # Valor por defecto
            'año': valuation.year_built,
            'estado': valuation.condition,
            'habitaciones': valuation.rooms,
            'baños': valuation.bathrooms,
            'extras': valuation.extras.split(',') if valuation.extras else [],
            'valoracion': '{:,.0f}€'.format(valuation.estimated_value),
            'estimated_value': valuation.estimated_value,
            'fecha': valuation.created_at.strftime('%d/%m/%Y')
        })

    return render_template('dashboard.html', valuations=valuations_data)


@app.route('/login', methods=['GET', 'POST'])
def login():
    from models import User

    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        phone = request.form.get('phone')
        password = request.form.get('password')

        user = User.query.filter_by(phone=phone).first()

        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('dashboard'))

        return render_template('login.html',
                               error='Teléfono o contraseña incorrectos')

    return render_template('login.html')


@app.route('/register', methods=['GET', 'POST'])
def register():
    from models import User

    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))

    if request.method == 'POST':
        username = request.form.get('username')
        phone = request.form.get('phone')
        password = request.form.get('password')

        # Verificar que el teléfono no esté ya registrado
        existing_user = User.query.filter_by(phone=phone).first()

        if existing_user:
            return render_template('register.html',
                                   error='Este teléfono ya está registrado')

        new_user = User(
            username=username,

            password_hash=generate_password_hash(password),
            phone=phone)

        db.session.add(new_user)
        db.session.commit()

        login_user(new_user)
        return redirect(url_for('dashboard'))

    return render_template('register.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))
    
    
# Admin routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    from models import Admin
    
    # If admin is already logged in, redirect to dashboard
    if current_user.is_authenticated and isinstance(current_user, Admin):
        return redirect(url_for('admin_dashboard'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(username=username).first()
        
        if admin and check_password_hash(admin.password_hash, password):
            # We modify the user_id to indicate it's an admin
            admin.get_id = lambda: f"admin_{admin.id}"
            login_user(admin)
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Usuario o contraseña incorrectos', 'danger')
            
    return render_template('admin/login.html')
    
@app.route('/admin')
@admin_required
def admin_dashboard():
    from models import User, PropertyValuation
    
    # Get all users with their valuation counts
    users = User.query.all()
    user_data = []
    
    for user in users:
        valuation_count = PropertyValuation.query.filter_by(user_id=user.id).count()
        user_data.append({
            'id': user.id,
            'username': user.username,
            'phone': user.phone,
            'created_at': user.created_at.strftime('%d/%m/%Y'),
            'valuation_count': valuation_count,
            'wants_to_sell': user.wants_to_sell
        })
    
    return render_template('admin/dashboard.html', users=user_data)
    
@app.route('/admin/user/<int:user_id>')
@admin_required
def admin_user_detail(user_id):
    from models import User, PropertyValuation
    
    user = User.query.get_or_404(user_id)
    valuations = PropertyValuation.query.filter_by(user_id=user_id).order_by(PropertyValuation.created_at.desc()).all()
    
    valuations_data = []
    for valuation in valuations:
        valuations_data.append({
            'id': valuation.id,
            'direccion': valuation.address,
            'ref_catastral': valuation.ref_catastral,
            'superficie': valuation.surface_area,
            'tipo': valuation.property_type,
            'clase': 'Residencial',  # Default value
            'uso': 'Vivienda',       # Default value
            'año': valuation.year_built,
            'estado': valuation.condition,
            'habitaciones': valuation.rooms,
            'baños': valuation.bathrooms,
            'extras': valuation.extras.split(',') if valuation.extras else [],
            'valoracion': '{:,.0f}€'.format(valuation.estimated_value),
            'estimated_value': valuation.estimated_value,
            'fecha': valuation.created_at.strftime('%d/%m/%Y')
        })
    
    return render_template('admin/user_detail.html', user=user, valuations=valuations_data)
    
@app.route('/admin/logout')
@admin_required
def admin_logout():
    logout_user()
    return redirect(url_for('admin_login'))


@app.route('/api/catastro', methods=['GET'])
def get_catastro_data():
    refcat = request.args.get('refcat')
    via = request.args.get('via')
    numero = request.args.get('numero')
    codigo = request.args.get('codigo')

    try:
        if refcat:
            data = catastro.consulta_dnprc(refcat)
            inmuebles = catastro.extraer_datos(data)
            return jsonify(inmuebles)
        elif via and numero and codigo:
            refcat_corta = catastro.consulta_dnp_loc("MURCIA", "MURCIA",
                                                     codigo, via, numero)
            if not refcat_corta:
                return jsonify([])
            else:
                data = catastro.consulta_dnprc(refcat_corta)
                inmuebles = catastro.extraer_datos(data)
                return jsonify(inmuebles)
        else:
            return jsonify({"error": "Parámetros insuficientes"}), 400
    except Exception as e:
        app.logger.error(f"Error en consulta de catastro: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/valoracion', methods=['POST'])
def valorar_inmueble():
    """Calculate property valuation based on features"""
    from models import PropertyValuation

    data = request.json

    # Obtener la dirección para determinar el barrio (en un sistema real esto sería más preciso)
    direccion = data.get('direccion', '').lower()

    # 1. Precio base por barrio (€/m²)
    if 'vista alegre' in direccion:
        base_price_per_m2 = 1850
        barrio = 'Vista Alegre'
    elif 'santa maría de gracia' in direccion or 'maria de gracia' in direccion:
        base_price_per_m2 = 1750
        barrio = 'Santa María de Gracia'
    elif 'la flota' in direccion:
        base_price_per_m2 = 1900
        barrio = 'La Flota'
    else:
        base_price_per_m2 = 1600  # Valor por defecto para otros barrios
        barrio = 'Otro'

    # Extract property data
    ref_catastral = data.get('ref_catastral', '')
    superficie = float(data.get('superficie', 0))
    anio_construccion = int(data.get('anio', 2000))
    estado = data.get('estado', 'normal')
    tipo = data.get('tipo', 'piso')
    habitaciones = int(data.get('habitaciones', 3))
    banos = int(data.get('banos', 1))
    extras_list = data.get('extras', [])
    extras_str = ','.join(extras_list)

    # 2. Factores de ajuste por antigüedad
    current_year = 2025
    edad_edificio = current_year - anio_construccion

    if edad_edificio < 5:
        # Edificios nuevos (menos de 5 años): +20%
        age_factor = 1.20
    elif edad_edificio < 15:
        # Edificios relativamente nuevos (menos de 15 años): +10%
        age_factor = 1.10
    elif edad_edificio > 40:
        # Edificios antiguos (más de 40 años): -15%
        age_factor = 0.85
    else:
        # Sin modificación para edificios entre 15 y 40 años
        age_factor = 1.0

    # 3. Factores de ajuste por estado de conservación
    condition_factors = {
        'excelente': 1.15,  # Estado "Perfecto": +15%
        'normal': 1.0,  # Estado "Normal": sin modificación
        'malo': 0.80  # Estado "A reformar": -20%
    }
    condition_factor = condition_factors.get(estado, 1.0)

    # 4. Factores de ajuste por tipo de propiedad
    type_factors = {
        'piso': 1.0,  # Piso estándar: factor 1.0 (referencia)
        'chalet': 1.3,  # Chalet: factor 1.3 (+30%)
        'dúplex': 1.2,  # Dúplex: factor 1.2 (+20%)
        'ático': 1.25,  # Ático (añadido): factor 1.25 (+25%)
        'otros': 0.95  # Otros (estudio, etc.): factor 0.95 (-5%)
    }
    type_factor = type_factors.get(tipo, 1.0)

    # 5. Ajuste específico para Vista Alegre
    vista_alegre_factor = 1.22 if barrio == 'Vista Alegre' else 1.0

    # 6. Ajustes por comodidades/amenities
    extras_value = 0
    if 'ascensor' in extras_list:
        extras_value += 0.07  # +7%
    if 'garaje' in extras_list:
        extras_value += 0.05  # +5%
    if 'terraza' in extras_list:
        extras_value += 0.03  # +3%
    if 'piscina' in extras_list:
        extras_value += 0.10  # +10%
    if 'trastero' in extras_list:
        extras_value += 0.02  # +2% (añadido ya que es común en valoraciones)
    if 'amueblado' in extras_list:
        extras_value += 0.03  # +3% (añadido para esta característica)
    extras_factor = 1 + extras_value

    # 7. Ajuste por número de habitaciones
    room_factor = 1 + (0.1 * habitaciones)

    # 7.1 Ajuste por número de baños
    bathroom_factor = 1 + (0.1 * banos)

    # 8. Calcular valor base por metro cuadrado
    price_per_m2 = base_price_per_m2

    # 9. Aplicar factores de ajuste
    adjusted_price = price_per_m2 * age_factor * condition_factor * type_factor * extras_factor * room_factor * bathroom_factor * vista_alegre_factor

    # 10. Calcular precio total
    total_price = adjusted_price * superficie

    # Calcular horquilla de precios (-10% y +10%)
    precio_min = total_price * 0.9
    precio_max = total_price * 1.1
    
    # Format as currency
    formatted_price = f"{total_price:,.0f}€"
    formatted_precio_min = f"{precio_min:,.0f}€"
    formatted_precio_max = f"{precio_max:,.0f}€"
    price_per_m2_formatted = f"{adjusted_price:,.0f}€/m²"

    app.logger.debug(
        f"Valoración: Base: {base_price_per_m2}€/m², Barrio: {barrio}, " +
        f"Factores: edad={age_factor}, estado={condition_factor}, " +
        f"tipo={type_factor}, extras={extras_factor}, habitaciones={room_factor}, "
        +
        f"vista_alegre={vista_alegre_factor}. Precio final: {adjusted_price}€/m²"
    )

    # Si el usuario está autenticado, guardamos la valoración en la base de datos
    if current_user.is_authenticated:
        valuation = PropertyValuation(user_id=current_user.id,
                                      ref_catastral=ref_catastral,
                                      address=direccion,
                                      surface_area=superficie,
                                      property_type=tipo,
                                      year_built=anio_construccion,
                                      condition=estado,
                                      rooms=habitaciones,
                                      bathrooms=banos,
                                      extras=extras_str,
                                      estimated_value=total_price)
        db.session.add(valuation)
        db.session.commit()

        # Guardar ID de valoración en la sesión para recuperarla en el dashboard
        session['last_valuation_id'] = valuation.id
    else:
        # Si el usuario no está autenticado, guardamos los datos en la sesión para recuperarlos después
        session['pending_valuation'] = {
            'ref_catastral': ref_catastral,
            'address': direccion,
            'surface_area': superficie,
            'property_type': tipo,
            'year_built': anio_construccion,
            'condition': estado,
            'rooms': habitaciones,
            'bathrooms': banos,
            'extras': extras_str,
            'estimated_value': total_price,
            'formatted_price': formatted_price,
            'price_per_m2': price_per_m2_formatted,
            'factores': {
                'barrio': barrio,
                'precio_base': f"{base_price_per_m2}€/m²",
                'antigüedad': f"{age_factor:.2f}",
                'estado': f"{condition_factor:.2f}",
                'tipo': f"{type_factor:.2f}",
                'habitaciones': f"{room_factor:.2f}",
                'baños': f"{bathroom_factor:.2f}",
                'extras': f"{extras_factor:.2f}",
                'vista_alegre': f"{vista_alegre_factor:.2f}"
            }
        }

    return jsonify({
        'precio_total': formatted_price,
        'precio_min': formatted_precio_min,
        'precio_max': formatted_precio_max,
        'precio_m2': price_per_m2_formatted,
        'factores': {
            'barrio': barrio,
            'precio_base': f"{base_price_per_m2}€/m²",
            'antigüedad': f"{age_factor:.2f}",
            'estado': f"{condition_factor:.2f}",
            'tipo': f"{type_factor:.2f}",
            'habitaciones': f"{room_factor:.2f}",
            'baños': f"{bathroom_factor:.2f}",
            'extras': f"{extras_factor:.2f}",
            'vista_alegre': f"{vista_alegre_factor:.2f}"
        }
    })


@app.route('/api/update_profile', methods=['POST'])
@login_required
def update_profile():
    from models import User

    data = request.json
    user = User.query.get(current_user.id)

    if 'username' in data:
        # Check if username is already taken by another user
        existing_user = User.query.filter(User.username == data['username'],
                                          User.id != current_user.id).first()
        if existing_user:
            return jsonify({"error":
                            "Este nombre de usuario ya está en uso"}), 400
        user.username = data['username']

    if 'phone' in data:
        # Check if phone is already taken by another user
        existing_user = User.query.filter(User.phone == data['phone'], User.id
                                          != current_user.id).first()
        if existing_user:
            return jsonify({"error": "Este teléfono ya está registrado"}), 400
        user.phone = data['phone']

    db.session.commit()
    return jsonify({"success": True})


@app.route('/api/change_password', methods=['POST'])
@login_required
def change_password():
    from models import User

    data = request.json
    user = User.query.get(current_user.id)

    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not check_password_hash(user.password_hash, current_password):
        return jsonify({"error": "Current password is incorrect"}), 400

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"success": True})


@app.route('/api/register', methods=['POST'])
def api_register():
    from models import User, PropertyValuation

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    username = data.get('username')
    password = data.get('password')
    phone = data.get('phone')

    if not username or not password or not phone:
        return jsonify(
            {"error": "Nombre, teléfono y contraseña son obligatorios"}), 400

    # Verificar si el teléfono ya existe
    existing_user = User.query.filter_by(phone=phone).first()
    if existing_user:
        return jsonify({"error": "Este teléfono ya está registrado"}), 400

    # Crear el nuevo usuario
    new_user = User(
        username=username,
        password_hash=generate_password_hash(password),
        phone=phone)

    db.session.add(new_user)
    db.session.commit()

    # Iniciar sesión con el nuevo usuario
    login_user(new_user)

    # Comprobar si hay una valoración pendiente en la sesión y asociarla al nuevo usuario
    if 'pending_valuation' in session:
        print("🟡 Guardando valoración desde sesión al iniciar sesión")
        pending = session.get('pending_valuation')
        print("📦 Datos guardados:", pending)

        # Crear nueva valoración asociada al usuario recién registrado
        valuation = PropertyValuation(
            user_id=new_user.id,
            ref_catastral=pending.get('ref_catastral', ''),
            address=pending.get('address', ''),
            surface_area=pending.get('surface_area', 0),
            property_type=pending.get('property_type', ''),
            year_built=pending.get('year_built', 0),
            condition=pending.get('condition', ''),
            rooms=pending.get('rooms', 0),
            bathrooms=pending.get('bathrooms', 0),
            extras=pending.get('extras', ''),
            estimated_value=pending.get('estimated_value', 0))

        db.session.add(valuation)
        db.session.commit()

        # La valoración pendiente ya está guardada, así que la eliminamos de la sesión
        session.pop('pending_valuation', None)

    return jsonify({
        "success": True,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "phone": new_user.phone
        }
    })


@app.route('/api/login', methods=['POST'])
def api_login():
    from models import User, PropertyValuation

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    phone = data.get('phone')
    password = data.get('password')

    if not phone or not password:
        return jsonify({"error":
                        "Teléfono y contraseña son obligatorios"}), 400

    user = User.query.filter_by(phone=phone).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Teléfono o contraseña incorrectos"}), 401

    login_user(user)

    # Comprobar si hay una valoración pendiente en la sesión y asociarla al usuario
    if 'pending_valuation' in session:
        pending = session.get('pending_valuation')

        # Crear nueva valoración asociada al usuario que inicia sesión
        valuation = PropertyValuation(
            user_id=user.id,
            ref_catastral=pending.get('ref_catastral', ''),
            address=pending.get('address', ''),
            surface_area=pending.get('surface_area', 0),
            property_type=pending.get('property_type', ''),
            year_built=pending.get('year_built', 0),
            condition=pending.get('condition', ''),
            rooms=pending.get('rooms', 0),
            bathrooms=pending.get('bathrooms', 0),
            extras=pending.get('extras', ''),
            estimated_value=pending.get('estimated_value', 0))

        db.session.add(valuation)
        db.session.commit()

        # La valoración pendiente ya está guardada, así que la eliminamos de la sesión
        session.pop('pending_valuation', None)

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "phone": user.phone
        }
    })


@app.route('/api/user', methods=['GET'])
@login_required
def get_current_user():
    return jsonify({
        "id": current_user.id,
        "username": current_user.username,
        "phone": current_user.phone
    })

@app.route('/api/toggle-wants-to-sell', methods=['POST'])
@login_required
def toggle_wants_to_sell_api():
    """Ruta para marcar/desmarcar que el usuario quiere vender su casa (API)"""
    # Cambiar el estado de wants_to_sell
    current_user.wants_to_sell = not current_user.wants_to_sell
    db.session.commit()
    
    estado = "activado" if current_user.wants_to_sell else "desactivado"
    return jsonify({
        'success': True, 
        'message': f'Estado de venta {estado}',
        'wants_to_sell': current_user.wants_to_sell
    })

@app.route('/quiero-vender')
@login_required
def toggle_wants_to_sell():
    """Ruta para marcar que el usuario quiere vender su casa (enlace directo)"""
    # Activar el estado de wants_to_sell
    current_user.wants_to_sell = True
    db.session.commit()
    
    # Mostrar un mensaje flash y redirigir al dashboard
    flash('Gracias, nos pondremos en contacto contigo.', 'success')
    return redirect(url_for('dashboard'))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
