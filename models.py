from app import db
from flask_login import UserMixin
from datetime import datetime

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)  # Teléfono como identificador único
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    wants_to_sell = db.Column(db.Boolean, default=False)  # Indica si el usuario quiere vender su casa
    valuations = db.relationship('PropertyValuation', backref='user', lazy='dynamic')
    
class Admin(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), nullable=False, unique=True)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
class PropertyValuation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    ref_catastral = db.Column(db.String(20))
    address = db.Column(db.String(200))
    surface_area = db.Column(db.Float)
    property_type = db.Column(db.String(50))
    year_built = db.Column(db.Integer)
    condition = db.Column(db.String(50))
    rooms = db.Column(db.Integer)
    bathrooms = db.Column(db.Integer)  # Añadimos columna para baños
    extras = db.Column(db.String(200))
    estimated_value = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
