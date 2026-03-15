from datetime import datetime
from app import db


class JobApplication(db.Model):
    __tablename__ = 'job_applications'

    id = db.Column(db.Integer, primary_key=True, comment='记录ID')
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False, comment='岗位ID')
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id'), nullable=False, comment='简历ID')
    applicant_name = db.Column(db.String(100), comment='申请人姓名')
    applicant_email = db.Column(db.String(120), comment='申请人邮箱')
    applicant_phone = db.Column(db.String(20), comment='申请人电话')
    applicant_city = db.Column(db.String(100), comment='申请人城市')
    status = db.Column(db.String(20), default='pending', comment='状态: pending/screening/pass/interviewing/hired/rejected')
    
    matching_score = db.Column(db.Float, comment='综合匹配度评分(0-100)')
    skill_score = db.Column(db.Float, comment='技能匹配度评分(0-100)')
    experience_score = db.Column(db.Float, comment='经验相关性评分(0-100)')
    education_score = db.Column(db.Float, comment='教育背景契合度评分(0-100)')
    ai_comment = db.Column(db.Text, comment='AI评语')
    matching_data = db.Column(db.JSON, comment='详细匹配数据')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, comment='创建时间')
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment='更新时间')

    job = db.relationship('Job', back_populates='applications')
    resume = db.relationship('Resume')

    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'resume_id': self.resume_id,
            'applicant_name': self.applicant_name,
            'applicant_email': self.applicant_email,
            'applicant_phone': self.applicant_phone,
            'applicant_city': self.applicant_city,
            'status': self.status,
            'matching_score': self.matching_score,
            'skill_score': self.skill_score,
            'experience_score': self.experience_score,
            'education_score': self.education_score,
            'ai_comment': self.ai_comment,
            'matching_data': self.matching_data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resume': self.resume.to_dict() if self.resume else None,
            'job': self.job.to_dict() if self.job else None
        }
