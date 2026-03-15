from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import uuid
from app import db
from app.models import Resume, Candidate, User

bp = Blueprint('resumes', __name__, url_prefix='/api/resumes')

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', '/tmp/uploads')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@bp.route('', methods=['GET'])
@jwt_required()
def get_resumes():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    candidate_id = request.args.get('candidate_id', type=int)
    parsing_status = request.args.get('parsing_status')
    
    query = Resume.query
    
    if candidate_id:
        query = query.filter_by(candidate_id=candidate_id)
    if parsing_status:
        query = query.filter_by(parsing_status=parsing_status)
    
    pagination = query.order_by(Resume.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'resumes': [r.to_dict() for r in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@bp.route('/<int:resume_id>', methods=['GET'])
@jwt_required()
def get_resume(resume_id):
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    return jsonify({'resume': resume.to_dict()})


@bp.route('', methods=['POST'])
@jwt_required()
def upload_resume():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.candidate:
        return jsonify({'error': 'Candidate profile not found'}), 404
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    
    file.save(file_path)
    
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    resume = Resume(
        candidate_id=user.candidate.id,
        file_name=filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
        parsing_status='pending'
    )
    
    db.session.add(resume)
    db.session.commit()
    
    return jsonify({'resume': resume.to_dict()}), 201


@bp.route('/<int:resume_id>', methods=['DELETE'])
@jwt_required()
def delete_resume(resume_id):
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    if os.path.exists(resume.file_path):
        os.remove(resume.file_path)
    
    db.session.delete(resume)
    db.session.commit()
    
    return jsonify({'message': 'Resume deleted successfully'})


@bp.route('/<int:resume_id>/download', methods=['GET'])
@jwt_required()
def download_resume(resume_id):
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    if not os.path.exists(resume.file_path):
        return jsonify({'error': 'File not found'}), 404
    
    return send_file(
        resume.file_path,
        download_name=resume.file_name,
        as_attachment=True
    )
