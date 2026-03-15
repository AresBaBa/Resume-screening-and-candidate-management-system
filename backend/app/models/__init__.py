from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    """用户表 - 所有用户统一管理，无需区分角色"""
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


class Resume(db.Model):
    """简历表 - 用户上传的简历"""
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


class Job(db.Model):
    """职位表 - 公开的职位信息"""
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


class JobApplication(db.Model):
    """岗位申请/匹配记录表 - 连接岗位和简历，记录匹配评分"""
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
