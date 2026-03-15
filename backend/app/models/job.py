from datetime import datetime
from app import db


class Job(db.Model):
    __tablename__ = 'jobs'

    id = db.Column(db.Integer, primary_key=True, comment='职位ID')
    title = db.Column(db.String(200), nullable=False, comment='职位名称')
    description = db.Column(db.Text, nullable=False, comment='职位描述')
    requirements = db.Column(db.JSON, comment='职位要求')
    skills_required = db.Column(db.JSON, comment='必备技能列表')
    skills_preferred = db.Column(db.JSON, comment='加分技能列表')
    location = db.Column(db.String(200), comment='工作地点')
    salary_range = db.Column(db.String(100), comment='薪资范围')
    employment_type = db.Column(db.String(50), comment='工作类型: full-time/part-time/contract/internship')
    status = db.Column(db.String(20), default='open', comment='状态: open/closed')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), comment='创建者ID')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.Date, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    applications = db.relationship('JobApplication', back_populates='job', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'requirements': self.requirements,
            'skills_required': self.skills_required,
            'skills_preferred': self.skills_preferred,
            'location': self.location,
            'salary_range': self.salary_range,
            'employment_type': self.employment_type,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
