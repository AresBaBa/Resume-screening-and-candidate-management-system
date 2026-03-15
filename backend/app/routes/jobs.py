from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Job

bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')


@bp.route('', methods=['GET'])
def get_jobs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status', 'open')
    location = request.args.get('location')
    employment_type = request.args.get('employment_type')
    
    query = Job.query.filter_by(status=status)
    
    if location:
        query = query.filter(Job.location.ilike(f'%{location}%'))
    if employment_type:
        query = query.filter_by(employment_type=employment_type)
    
    pagination = query.order_by(Job.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'jobs': [j.to_dict() for j in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@bp.route('/<int:job_id>', methods=['GET'])
def get_job(job_id):
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    return jsonify({'job': job.to_dict()})


@bp.route('', methods=['POST'])
@jwt_required()
def create_job():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    job = Job(
        title=data['title'],
        description=data['description'],
        requirements=data.get('requirements'),
        skills_required=data.get('skills_required'),
        location=data.get('location'),
        salary_range=data.get('salary_range'),
        employment_type=data.get('employment_type', 'full-time'),
        created_by=current_user_id
    )
    
    db.session.add(job)
    db.session.commit()
    
    return jsonify({'job': job.to_dict()}), 201


@bp.route('/<int:job_id>', methods=['PUT'])
@jwt_required()
def update_job(job_id):
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    data = request.get_json()
    
    if 'title' in data:
        job.title = data['title']
    if 'description' in data:
        job.description = data['description']
    if 'requirements' in data:
        job.requirements = data['requirements']
    if 'skills_required' in data:
        job.skills_required = data['skills_required']
    if 'location' in data:
        job.location = data['location']
    if 'salary_range' in data:
        job.salary_range = data['salary_range']
    if 'employment_type' in data:
        job.employment_type = data['employment_type']
    if 'status' in data:
        job.status = data['status']
    
    db.session.commit()
    
    return jsonify({'job': job.to_dict()})


@bp.route('/<int:job_id>', methods=['DELETE'])
@jwt_required()
def delete_job(job_id):
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    db.session.delete(job)
    db.session.commit()
    
    return jsonify({'message': 'Job deleted successfully'})
