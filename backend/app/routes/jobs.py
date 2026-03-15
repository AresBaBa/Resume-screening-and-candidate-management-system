from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Job, Resume, JobApplication
from app.services.ai_service import match_resume_to_job
from app.routes.websocket import send_notification

bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')


@bp.route('', methods=['GET'])
def get_jobs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
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
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    
    job = Job(
        title=data['title'],
        description=data['description'],
        requirements=data.get('requirements'),
        skills_required=data.get('skills_required'),
        skills_preferred=data.get('skills_preferred'),
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
    if 'skills_preferred' in data:
        job.skills_preferred = data['skills_preferred']
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


@bp.route('/<int:job_id>/match', methods=['POST'])
@jwt_required()
def match_job_resumes(job_id):
    """对岗位的所有简历进行AI匹配评分"""
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    data = request.get_json() or {}
    resume_ids = data.get('resume_ids', None)
    
    if resume_ids:
        resumes = Resume.query.filter(Resume.id.in_(resume_ids), Resume.parsing_status == 'completed').all()
    else:
        resumes = Resume.query.filter_by(parsing_status='completed').all()
    
    print(f"tazlyx debug: Matching {len(resumes)} resumes to job: {job.title}")
    
    job_data = job.to_dict()
    matched_count = 0
    results = []
    
    for resume in resumes:
        existing = JobApplication.query.filter_by(job_id=job_id, resume_id=resume.id).first()
        
        if existing and data.get('skip_existing', False):
            results.append(existing.to_dict())
            continue
        
        resume_structured = resume.ai_structured or {}
        resume_skills = resume.ai_skills or []
        
        resume_data = {
            'skills': resume_skills,
            'experience': resume.ai_experience or [],
            'education': resume.ai_education or [],
            'summary': resume.ai_summary or '',
            'city': (resume.ai_contact or {}).get('city', '')
        }
        
        print(f"tazlyx debug: Matching resume {resume.id} - {resume.ai_contact.get('name') if resume.ai_contact else 'Unknown'}")
        
        matching_result = match_resume_to_job(resume_data, job_data)
        
        contact = resume.ai_contact or {}
        
        if existing:
            existing.matching_score = matching_result.get('matching_score', 0)
            existing.skill_score = matching_result.get('skill_score', 0)
            existing.experience_score = matching_result.get('experience_score', 0)
            existing.education_score = matching_result.get('education_score', 0)
            existing.ai_comment = matching_result.get('ai_comment', '')
            existing.matching_data = matching_result.get('matching_data', {})
            application = existing
        else:
            application = JobApplication(
                job_id=job_id,
                resume_id=resume.id,
                applicant_name=contact.get('name'),
                applicant_email=contact.get('email'),
                applicant_phone=contact.get('phone'),
                applicant_city=contact.get('city'),
                matching_score=matching_result.get('matching_score', 0),
                skill_score=matching_result.get('skill_score', 0),
                experience_score=matching_result.get('experience_score', 0),
                education_score=matching_result.get('education_score', 0),
                ai_comment=matching_result.get('ai_comment', ''),
                matching_data=matching_result.get('matching_data', {}),
                status='screening'
            )
            db.session.add(application)
        
        results.append(application.to_dict())
        matched_count += 1
    
    db.session.commit()
    
    print(f"tazlyx debug: Matched {matched_count} resumes to job {job_id}")
    
    current_user_id = get_jwt_identity()
    send_notification(
        current_user_id,
        'match_complete',
        '匹配完成',
        f'岗位 "{job.title}" 已完成 {matched_count} 份简历的匹配',
        job_id
    )
    
    return jsonify({
        'message': f'Successfully matched {matched_count} resumes',
        'matched_count': matched_count,
        'results': results
    }), 200


@bp.route('/<int:job_id>/candidates', methods=['GET'])
def get_job_candidates(job_id):
    """获取岗位的候选人列表（筛选功能）"""
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    min_score = request.args.get('min_score', type=float)
    max_score = request.args.get('max_score', type=float)
    status = request.args.get('status')
    city = request.args.get('city')
    skill = request.args.get('skill')
    sort_by = request.args.get('sort_by', 'matching_score')
    sort_order = request.args.get('sort_order', 'desc')
    
    query = JobApplication.query.filter_by(job_id=job_id)
    
    if min_score is not None:
        query = query.filter(JobApplication.matching_score >= min_score)
    if max_score is not None:
        query = query.filter(JobApplication.matching_score <= max_score)
    if status:
        query = query.filter_by(status=status)
    if city:
        query = query.filter(JobApplication.applicant_city.ilike(f'%{city}%'))
    
    if sort_by == 'matching_score':
        if sort_order == 'desc':
            query = query.order_by(JobApplication.matching_score.desc())
        else:
            query = query.order_by(JobApplication.matching_score.asc())
    elif sort_by == 'skill_score':
        if sort_order == 'desc':
            query = query.order_by(JobApplication.skill_score.desc())
        else:
            query = query.order_by(JobApplication.skill_score.asc())
    elif sort_by == 'experience_score':
        if sort_order == 'desc':
            query = query.order_by(JobApplication.experience_score.desc())
        else:
            query = query.order_by(JobApplication.experience_score.asc())
    elif sort_by == 'education_score':
        if sort_order == 'desc':
            query = query.order_by(JobApplication.education_score.desc())
        else:
            query = query.order_by(JobApplication.education_score.asc())
    elif sort_by == 'created_at':
        if sort_order == 'desc':
            query = query.order_by(JobApplication.created_at.desc())
        else:
            query = query.order_by(JobApplication.created_at.asc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    candidates = []
    for app in pagination.items:
        app_dict = app.to_dict()
        if skill and skill.lower() not in [s.lower() for s in (app.resume.ai_skills or [])]:
            continue
        candidates.append(app_dict)
    
    return jsonify({
        'candidates': candidates,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@bp.route('/<int:job_id>/candidates/<int:application_id>', methods=['GET'])
def get_job_candidate(job_id, application_id):
    """获取岗位候选人的详细信息"""
    application = JobApplication.query.filter_by(id=application_id, job_id=job_id).first()
    
    if not application:
        return jsonify({'error': 'Candidate not found'}), 404
    
    return jsonify({'candidate': application.to_dict()})


@bp.route('/<int:job_id>/candidates/<int:application_id>/status', methods=['PUT'])
@jwt_required()
def update_candidate_status(job_id, application_id):
    """更新候选人状态"""
    application = JobApplication.query.filter_by(id=application_id, job_id=job_id).first()
    
    if not application:
        return jsonify({'error': 'Candidate not found'}), 404
    
    data = request.get_json()
    
    if 'status' in data:
        valid_statuses = ['pending', 'screening', 'pass', 'interviewing', 'hired', 'rejected']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400
        application.status = data['status']
    
    db.session.commit()
    
    print(f"tazlyx debug: Updated candidate {application_id} status to {application.status}")
    
    return jsonify({
        'candidate': application.to_dict(),
        'message': 'Status updated successfully'
    })


@bp.route('/candidates', methods=['GET'])
@jwt_required()
def get_all_candidates():
    """获取所有岗位的候选人（跨岗位筛选）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    job_id = request.args.get('job_id', type=int)
    min_score = request.args.get('min_score', type=float)
    max_score = request.args.get('max_score', type=float)
    status = request.args.get('status')
    city = request.args.get('city')
    skill = request.args.get('skill')
    sort_by = request.args.get('sort_by', 'matching_score')
    sort_order = request.args.get('sort_order', 'desc')
    
    query = JobApplication.query
    
    if job_id:
        query = query.filter_by(job_id=job_id)
    if min_score is not None:
        query = query.filter(JobApplication.matching_score >= min_score)
    if max_score is not None:
        query = query.filter(JobApplication.matching_score <= max_score)
    if status:
        query = query.filter_by(status=status)
    if city:
        query = query.filter(JobApplication.applicant_city.ilike(f'%{city}%'))
    
    if sort_by == 'matching_score':
        if sort_order == 'desc':
            query = query.order_by(JobApplication.matching_score.desc())
        else:
            query = query.order_by(JobApplication.matching_score.asc())
    elif sort_by == 'created_at':
        if sort_order == 'desc':
            query = query.order_by(JobApplication.created_at.desc())
        else:
            query = query.order_by(JobApplication.created_at.asc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    candidates = []
    for app in pagination.items:
        if skill:
            app_skills = [s.lower() for s in (app.resume.ai_skills or [])]
            if skill.lower() not in app_skills:
                continue
        candidates.append(app.to_dict())
    
    return jsonify({
        'candidates': candidates,
        'total': len(candidates),
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@bp.route('/candidates/<int:application_id>', methods=['GET'])
@jwt_required()
def get_candidate_detail(application_id):
    """获取候选人详情（包含简历完整信息）"""
    application = JobApplication.query.get(application_id)
    
    if not application:
        return jsonify({'error': 'Candidate not found'}), 404
    
    result = application.to_dict()
    result['resume']['file_path'] = application.resume.file_path if application.resume else None
    
    return jsonify({'candidate': result})


@bp.route('/candidates/<int:application_id>/status', methods=['PUT'])
@jwt_required()
def update_candidate_status_global(application_id):
    """更新候选人状态（全局）"""
    application = JobApplication.query.get(application_id)
    
    if not application:
        return jsonify({'error': 'Candidate not found'}), 404
    
    data = request.get_json()
    
    if 'status' in data:
        valid_statuses = ['pending', 'screening', 'pass', 'interviewing', 'hired', 'rejected']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400
        application.status = data['status']
    
    db.session.commit()
    
    print(f"tazlyx debug: Updated candidate {application_id} status to {application.status}")
    
    return jsonify({
        'candidate': application.to_dict(),
        'message': 'Status updated successfully'
    })


@bp.route('/candidates/batch-status', methods=['PUT'])
@jwt_required()
def batch_update_candidate_status():
    """批量更新候选人状态"""
    data = request.get_json()
    
    application_ids = data.get('application_ids', [])
    new_status = data.get('status')
    
    if not application_ids:
        return jsonify({'error': 'No application_ids provided'}), 400
    
    if not new_status:
        return jsonify({'error': 'No status provided'}), 400
    
    valid_statuses = ['pending', 'screening', 'pass', 'interviewing', 'hired', 'rejected']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400
    
    updated_count = JobApplication.query.filter(
        JobApplication.id.in_(application_ids)
    ).update({JobApplication.status: new_status}, synchronize_session=False)
    
    db.session.commit()
    
    print(f"tazlyx debug: Batch updated {updated_count} candidates status to {new_status}")
    
    return jsonify({
        'message': f'Successfully updated {updated_count} candidates',
        'updated_count': updated_count
    })


@bp.route('/candidates/compare', methods=['POST'])
@jwt_required()
def compare_candidates():
    """对比多个候选人的评分（选择2-3人并排对比）"""
    data = request.get_json()
    
    application_ids = data.get('application_ids', [])
    
    if not application_ids:
        return jsonify({'error': 'No application_ids provided'}), 400
    
    if len(application_ids) < 2:
        return jsonify({'error': 'At least 2 candidates required for comparison'}), 400
    
    if len(application_ids) > 3:
        return jsonify({'error': 'Maximum 3 candidates allowed for comparison'}), 400
    
    applications = JobApplication.query.filter(JobApplication.id.in_(application_ids)).all()
    
    if len(applications) != len(application_ids):
        return jsonify({'error': 'Some candidates not found'}), 404
    
    comparison = {
        'candidates': [app.to_dict() for app in applications],
        'comparison': {
            'metrics': ['matching_score', 'skill_score', 'experience_score', 'education_score'],
            'labels': ['综合评分', '技能匹配度', '经验相关性', '教育背景契合度']
        }
    }
    
    return jsonify({'comparison': comparison})
