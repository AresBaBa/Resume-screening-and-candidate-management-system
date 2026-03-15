from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import true
from werkzeug.utils import secure_filename
import os
import uuid
import hashlib
from app import db
from app.models import Resume, User
from app.services.resume_parser import parse_resume, parse_resume_with_ai, get_resume_thumbnail

bp = Blueprint('resumes', __name__, url_prefix='/api/resumes')

ALLOWED_EXTENSIONS = {'pdf', 'docx'}
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', '/tmp/uploads')

# 测试模式：忽略重复文件检测，允许重复上传相同文件用于测试分页
TEST_MODE = true
# TEST_MODE = false


def calculate_file_hash(file) -> str:
    """计算文件内容哈希值"""
    hash_md5 = hashlib.md5()
    file.seek(0)
    for chunk in iter(lambda: file.read(4096), b''):
        hash_md5.update(chunk)
    file.seek(0)
    return hash_md5.hexdigest()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_and_parse_resume(file, user_id):
    """
    保存并解析简历
    
    重复文件检测逻辑:
    1. 计算上传文件的MD5哈希值
    2. 查询数据库是否存在相同哈希的简历
    3. 如果存在:
       - 测试模式(TEST_MODE): 跳过重复检测，每次都创建新记录
       - 生产模式: 复用已有文件，重新进行AI解析，更新记录
    4. 如果不存在: 创建新文件和新记录
    """
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    original_filename = file.filename
    ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'pdf'
    
    # 计算文件哈希值，用于检测重复文件
    file_hash = calculate_file_hash(file)
    print(f"tazlyx debug: File hash: {file_hash}")
    
    # 检测是否存在相同文件（非测试模式）
    if not TEST_MODE:
        existing_resume = Resume.query.filter_by(file_hash=file_hash).first()
        if existing_resume and os.path.exists(existing_resume.file_path):
            print(f"tazlyx debug: Found existing resume with same hash, re-parsing: {existing_resume.id}")
            existing_resume.parsing_status = 'processing'
            db.session.flush()
            
            try:
                parsed_data = parse_resume_with_ai(existing_resume.file_path)
                
                existing_resume.parsed_data = parsed_data.get('raw_text', '')
                structured = parsed_data.get('structured', {})
                existing_resume.ai_summary = structured.get('summary', '')
                existing_resume.ai_skills = structured.get('skills', [])
                existing_resume.ai_experience = structured.get('experience', [])
                existing_resume.ai_education = structured.get('education', [])
                existing_resume.ai_projects = structured.get('projects', [])
                
                contact = {
                    'email': structured.get('email'),
                    'phone': structured.get('phone'),
                    'name': structured.get('name'),
                    'gender': structured.get('gender'),
                    'birthday': structured.get('birthday'),
                    'city': structured.get('city')
                }
                existing_resume.ai_contact = contact
                existing_resume.ai_structured = structured
                
                score_value = structured.get('score')
                if score_value is not None:
                    try:
                        existing_resume.ai_score = float(score_value) if isinstance(score_value, (int, float)) else float(str(score_value).strip())
                        if existing_resume.ai_score > 100:
                            existing_resume.ai_score = 100
                        elif existing_resume.ai_score < 0:
                            existing_resume.ai_score = 0
                    except (ValueError, TypeError):
                        existing_resume.ai_score = None
                
                print(f"tazlyx debug: Resume re-parsed - name: {contact.get('name')}, score: {existing_resume.ai_score}")
                existing_resume.parsing_status = 'completed'
                
            except Exception as e:
                print(f"tazlyx debug: Resume re-parsing error: {str(e)}")
                existing_resume.parsing_status = 'failed'
                existing_resume.parsed_data = str(e)
            
            return existing_resume
    
    # 测试模式或新文件: 创建新记录
    unique_filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    
    file.save(file_path)
    
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    # 创建新简历记录
    resume = Resume(
        user_id=user_id,
        file_name=original_filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
        file_hash=file_hash,
        parsing_status='processing'
    )
    
    db.session.add(resume)
    db.session.flush()
    
    try:
        print(f"tazlyx debug: Parsing resume: {original_filename}")
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
        
        score_value = structured.get('score')
        if score_value is not None:
            try:
                resume.ai_score = float(score_value) if isinstance(score_value, (int, float)) else float(str(score_value).strip())
                if resume.ai_score > 100:
                    resume.ai_score = 100
                elif resume.ai_score < 0:
                    resume.ai_score = 0
            except (ValueError, TypeError):
                resume.ai_score = None
        
        print(f"tazlyx debug: Resume parsed - name: {contact.get('name')}, skills: {resume.ai_skills}, score: {resume.ai_score}")
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
    per_page = request.args.get('per_page', 12, type=int)
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


@bp.route('/<int:resume_id>', methods=['PUT'])
@jwt_required()
def update_resume(resume_id):
    current_user_id = int(get_jwt_identity())
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    if resume.user_id != current_user_id:
        return jsonify({'error': 'Permission denied'}), 403
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    if 'ai_contact' in data:
        resume.ai_contact = data['ai_contact']
    if 'ai_summary' in data:
        resume.ai_summary = data['ai_summary']
    if 'ai_skills' in data:
        resume.ai_skills = data['ai_skills']
    if 'ai_experience' in data:
        resume.ai_experience = data['ai_experience']
    if 'ai_education' in data:
        resume.ai_education = data['ai_education']
    if 'ai_projects' in data:
        resume.ai_projects = data['ai_projects']
    if 'ai_score' in data:
        resume.ai_score = data['ai_score']
    if 'ai_feedback' in data:
        resume.ai_feedback = data['ai_feedback']
    
    db.session.commit()
    
    return jsonify({'resume': resume.to_dict(), 'message': 'Resume updated successfully'})


@bp.route('', methods=['POST'])
@jwt_required()
def upload_resume():
    current_user_id = int(get_jwt_identity())
    
    files = request.files.getlist('files')
    
    if not files or (len(files) == 1 and files[0].filename == ''):
        return jsonify({'error': 'No file provided'}), 400
    
    if len(files) > 5:
        return jsonify({'error': 'Maximum 5 files allowed at once'}), 400
    
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
