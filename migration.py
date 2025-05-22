from app import app, db
from models import User
from sqlalchemy import text

def add_wants_to_sell_column():
    """Añade la columna wants_to_sell a la tabla user"""
    with app.app_context():
        # Ejecutar la migración directamente con SQLAlchemy
        db.session.execute(text('ALTER TABLE user ADD COLUMN wants_to_sell BOOLEAN DEFAULT 0'))
        db.session.commit()
        print("✅ Columna 'wants_to_sell' añadida correctamente")

if __name__ == '__main__':
    add_wants_to_sell_column()