from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='candidate')
    avatar_url = db.Column(db.String(500))
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate = db.relationship('Candidate', back_populates='user', uselist=False)
    admin = db.relationship('Admin', back_populates='user', uselist=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'avatar_url': self.avatar_url,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Candidate(db.Model):
    __tablename__ = 'candidates'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    resume_url = db.Column(db.String(500))
    resume_parsed = db.Column(db.JSON)
    skills = db.Column(db.JSON)
    experience_years = db.Column(db.Integer)
    education = db.Column(db.JSON)
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', back_populates='candidate')
    applications = db.relationship('Application', back_populates='candidate')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'resume_url': self.resume_url,
            'resume_parsed': self.resume_parsed,
            'skills': self.skills,
            'experience_years': self.experience_years,
            'education': self.education,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Admin(db.Model):
    __tablename__ = 'admins'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    department = db.Column(db.String(100))
    position = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='admin')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'department': self.department,
            'position': self.position,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Job(db.Model):
    __tablename__ = 'jobs'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.JSON)
    skills_required = db.Column(db.JSON)
    location = db.Column(db.String(200))
    salary_range = db.Column(db.String(100))
    employment_type = db.Column(db.String(50))
    status = db.Column(db.String(50), default='open')
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    applications = db.relationship('Application', back_populates='job')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'requirements': self.requirements,
            'skills_required': self.skills_required,
            'location': self.location,
            'salary_range': self.salary_range,
            'employment_type': self.employment_type,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Application(db.Model):
    __tablename__ = 'applications'

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False)
    resume_id = db.Column(db.Integer, db.ForeignKey('resumes.id'))
    status = db.Column(db.String(50), default='pending')
    cover_letter = db.Column(db.Text)
    ai_score = db.Column(db.Float)
    ai_feedback = db.Column(db.Text)
    interview_status = db.Column(db.String(50), default='not_scheduled')
    interview_score = db.Column(db.Float)
    notes = db.Column(db.Text)
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate = db.relationship('Candidate', back_populates='applications')
    job = db.relationship('Job', back_populates='applications')
    resume = db.relationship('Resume', back_populates='application')

    def to_dict(self):
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'job_id': self.job_id,
            'resume_id': self.resume_id,
            'status': self.status,
            'cover_letter': self.cover_letter,
            'ai_score': self.ai_score,
            'ai_feedback': self.ai_feedback,
            'interview_status': self.interview_status,
            'interview_score': self.interview_score,
            'notes': self.notes,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Resume(db.Model):
    __tablename__ = 'resumes'

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(50))
    file_size = db.Column(db.Integer)
    parsed_data = db.Column(db.JSON)
    ai_summary = db.Column(db.Text)
    ai_skills = db.Column(db.JSON)
    ai_experience = db.Column(db.JSON)
    ai_education = db.Column(db.JSON)
    parsing_status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate = db.relationship('Candidate', backref='resumes')
    application = db.relationship('Application', back_populates='resume', uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'candidate_id': self.candidate_id,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'parsed_data': self.parsed_data,
            'ai_summary': self.ai_summary,
            'ai_skills': self.ai_skills,
            'ai_experience': self.ai_experience,
            'ai_education': self.ai_education,
            'parsing_status': self.parsing_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
