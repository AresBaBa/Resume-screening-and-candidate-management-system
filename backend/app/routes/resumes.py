from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import uuid
from app import db
from app.models import Resume, User
from app.services.resume_parser import parse_resume, parse_resume_with_ai, get_resume_thumbnail

bp = Blueprint('resumes', __name__, url_prefix='/api/resumes')

ALLOWED_EXTENSIONS = {'pdf', 'docx'}
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', '/tmp/uploads')


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_and_parse_resume(file, user_id):
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
        user_id=user_id,
        file_name=filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
        parsing_status='processing'
    )
    
    db.session.add(resume)
    db.session.flush()
    
    try:
        print(f"tazlyx debug: Parsing resume: {filename}")
        parsed_data = parse_resume_with_ai(file_path)
        print(f"tazlyx debug: Parsing result keys: {list(parsed_data.keys())}")
        
        resume.parsed_data = parsed_data.get('raw_text', '')
        structured = parsed_data.get('structured', {})
        resume.ai_summary = structured.get('summary', '')
        resume.ai_skills = structured.get('skills', [])
        resume.ai_experience = structured.get('experience', [])
        resume.ai_education = structured.get('education', [])
        resume.ai_projects = structured.get('projects', [])
        
        contact = {
            'email': structured.get('email'),
            'phone': structured.get('phone'),
            'name': structured.get('name'),
            'gender': structured.get('gender'),
            'birthday': structured.get('birthday'),
            'city': structured.get('city')
        }
        resume.ai_contact = contact
        resume.ai_structured = structured
        
        print(f"tazlyx debug: Resume parsed - name: {contact.get('name')}, skills: {resume.ai_skills}")
        resume.parsing_status = 'completed'
        
    except Exception as e:
        print(f"tazlyx debug: Resume parsing error: {str(e)}")
        resume.parsing_status = 'failed'
        resume.parsed_data = str(e)
    
    return resume


@bp.route('', methods=['GET'])
@jwt_required()
def get_resumes():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    user_id = request.args.get('user_id', type=int)
    parsing_status = request.args.get('parsing_status')
    
    query = Resume.query
    
    if user_id:
        query = query.filter_by(user_id=user_id)
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


@bp.route('/my', methods=['GET'])
@jwt_required()
def get_my_resumes():
    current_user_id = int(get_jwt_identity())
    
    resumes = Resume.query.filter_by(user_id=current_user_id).order_by(Resume.created_at.desc()).all()
    
    return jsonify({
        'resumes': [r.to_dict() for r in resumes]
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
    current_user_id = int(get_jwt_identity())
    
    files = request.files.getlist('files')
    
    if not files or (len(files) == 1 and files[0].filename == ''):
        return jsonify({'error': 'No file provided'}), 400
    
    if len(files) > 10:
        return jsonify({'error': 'Maximum 10 files allowed at once'}), 400
    
    valid_files = [f for f in files if f.filename and allowed_file(f.filename)]
    
    if not valid_files:
        return jsonify({'error': 'No valid files provided. Only PDF and DOCX are allowed'}), 400
    
    uploaded_resumes = []
    errors = []
    
    for file in valid_files:
        try:
            resume = save_and_parse_resume(file, current_user_id)
            uploaded_resumes.append(resume)
        except Exception as e:
            errors.append({
                'filename': file.filename,
                'error': str(e)
            })
    
    db.session.commit()
    
    response = {
        'uploaded': [r.to_dict() for r in uploaded_resumes],
        'success_count': len(uploaded_resumes),
    }
    
    if errors:
        response['errors'] = errors
        response['error_count'] = len(errors)
    
    status_code = 201 if uploaded_resumes else 400
    
    return jsonify(response), status_code


@bp.route('/<int:resume_id>', methods=['DELETE'])
@jwt_required()
def delete_resume(resume_id):
    current_user_id = int(get_jwt_identity())
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    if resume.user_id != current_user_id:
        return jsonify({'error': 'Permission denied'}), 403
    
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


@bp.route('/<int:resume_id>/reparse', methods=['POST'])
@jwt_required()
def reparse_resume(resume_id):
    current_user_id = int(get_jwt_identity())
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    if resume.user_id != current_user_id:
        return jsonify({'error': 'Permission denied'}), 403
    
    if not os.path.exists(resume.file_path):
        return jsonify({'error': 'File not found'}), 404
    
    resume.parsing_status = 'processing'
    db.session.commit()
    
    try:
        parsed_data = parse_resume(resume.file_path)
        
        resume.parsed_data = parsed_data.get('raw_text', '')
        structured = parsed_data.get('structured', {})
        resume.ai_summary = structured.get('summary', '')
        resume.ai_skills = structured.get('skills', [])
        resume.ai_experience = structured.get('experience', [])
        resume.ai_education = structured.get('education', '')
        
        contact = {
            'email': structured.get('email'),
            'phone': structured.get('phone'),
            'name': structured.get('name')
        }
        resume.ai_contact = contact
        
        resume.parsing_status = 'completed'
        
        db.session.commit()
        
        return jsonify({
            'resume': resume.to_dict(),
            'message': 'Resume re-parsed successfully'
        })
        
    except Exception as e:
        resume.parsing_status = 'failed'
        db.session.commit()
        return jsonify({'error': f'Failed to parse resume: {str(e)}'}), 500


@bp.route('/<int:resume_id>/thumbnail', methods=['GET'])
@jwt_required()
def get_resume_thumbnail_route(resume_id):
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    if not os.path.exists(resume.file_path):
        return jsonify({'error': 'File not found'}), 404
    
    if not resume.file_path.lower().endswith('.pdf'):
        return jsonify({'error': 'Thumbnail only available for PDF files'}), 400
    
    try:
        thumbnail_data = get_resume_thumbnail(resume.file_path)
        if thumbnail_data:
            return send_file(
                thumbnail_data,
                mimetype='image/png',
                as_attachment=False
            )
        else:
            return jsonify({'error': 'Failed to generate thumbnail'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
