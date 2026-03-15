from datetime import datetime
from app import db


class Resume(db.Model):
    __tablename__ = 'resumes'

    id = db.Column(db.Integer, primary_key=True, comment='简历ID')
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, comment='用户ID')
    file_name = db.Column(db.String(255), nullable=False, comment='文件名')
    file_path = db.Column(db.String(500), nullable=False, comment='文件路径')
    file_type = db.Column(db.String(10), comment='文件类型: pdf/docx')
    file_size = db.Column(db.Integer, comment='文件大小(字节)')
    file_hash = db.Column(db.String(64), nullable=True, comment='文件哈希值')
    parsing_status = db.Column(db.String(20), default='pending', comment='解析状态: pending/processing/completed/failed')
    parsed_data = db.Column(db.Text, comment='解析后的原始文本')
    
    ai_summary = db.Column(db.Text, comment='AI提取的个人简介')
    ai_skills = db.Column(db.JSON, comment='AI提取的技能列表')
    ai_experience = db.Column(db.JSON, comment='AI提取的工作经验')
    ai_education = db.Column(db.JSON, comment='AI提取的教育背景')
    ai_projects = db.Column(db.JSON, comment='AI提取的项目经历')
    ai_contact = db.Column(db.JSON, comment='AI提取的联系方式')
    ai_structured = db.Column(db.JSON, comment='AI提取的完整结构化数据')
    ai_score = db.Column(db.Float, comment='AI评分(0-100)')
    ai_feedback = db.Column(db.Text, comment='AI反馈')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    user = db.relationship('User', back_populates='resumes')
    applications = db.relationship('JobApplication', back_populates='resume', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'file_name': self.file_name,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'file_hash': self.file_hash,
            'parsing_status': self.parsing_status,
            'parsed_data': self.parsed_data,
            'ai_summary': self.ai_summary,
            'ai_skills': self.ai_skills,
            'ai_experience': self.ai_experience,
            'ai_education': self.ai_education,
            'ai_projects': self.ai_projects,
            'ai_contact': self.ai_contact,
            'ai_structured': self.ai_structured,
            'ai_score': self.ai_score,
            'ai_feedback': self.ai_feedback,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
