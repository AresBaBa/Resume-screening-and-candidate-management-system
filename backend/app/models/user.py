from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, comment='用户ID')
    email = db.Column(db.String(120), unique=True, nullable=False, index=True, comment='邮箱')
    password_hash = db.Column(db.String(256), nullable=False, comment='密码哈希')
    name = db.Column(db.String(100), nullable=False, comment='姓名')
    phone = db.Column(db.String(20), comment='手机号')
    avatar_url = db.Column(db.String(500), comment='头像URL')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    resumes = db.relationship('Resume', back_populates='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'phone': self.phone,
            'avatar_url': self.avatar_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
