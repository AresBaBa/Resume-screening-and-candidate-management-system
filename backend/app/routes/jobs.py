from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Job, Resume, JobApplication
from app.services.ai_service import match_resume_to_job
from app.routes.websocket import send_notification
from app.services.matching_state import get_matching_manager

# 职位管理路由模块：处理职位的增删改查、简历匹配以及候选人管理
bp = Blueprint('jobs', __name__, url_prefix='/api/jobs')


@bp.route('', methods=['GET'])
def get_jobs():
    """
    获取职位列表，支持分页和多种筛选条件（状态、地点、工作类型）
    """
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
    
    jobs_list = [j.to_dict() for j in pagination.items]
    job_ids = [j.id for j in pagination.items]
    
    matching_states = {}
    try:
        matching_manager = get_matching_manager()
        matching_states = matching_manager.get_matching_jobs(job_ids)
    except Exception as e:
        print(f"tazlyx debug: Failed to get matching states: {e}")
    
    for job in jobs_list:
        job_id = job.get('id')
        if job_id in matching_states:
            job['matching_state'] = matching_states[job_id]
        else:
            job['matching_state'] = None
    
    return jsonify({
        'jobs': jobs_list,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@bp.route('/<int:job_id>', methods=['GET'])
def get_job(job_id):
    """获取单个职位的详细信息"""
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    return jsonify({'job': job.to_dict()})


@bp.route('', methods=['POST'])
@jwt_required()
def create_job():
    """发布新职位，需要 JWT 认证"""
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
    """更新职位信息"""
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    data = request.get_json()
    
    # 支持部分字段更新
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
    """删除职位"""
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    db.session.delete(job)
    db.session.commit()
    
    return jsonify({'message': 'Job deleted successfully'})


@bp.route('/<int:job_id>/match', methods=['POST'])
@jwt_required()
def match_job_resumes(job_id):
    """
    对岗位的所有简历进行 AI 匹配评分。
    该函数会遍历简历库，调用 AI 服务计算每份简历与当前职位的匹配度，
    并生成/更新 JobApplication 记录。
    """
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    data = request.get_json() or {}
    resume_ids = data.get('resume_ids', None)
    
    current_user_id = int(get_jwt_identity())
    
    try:
        matching_manager = get_matching_manager()
        matching_manager.set_matching(job_id, current_user_id)
    except Exception as e:
        print(f"tazlyx debug: Failed to set matching state in Redis: {e}")
    
    # 筛选待匹配的简历：如果指定了 resume_ids 则仅匹配指定的，否则匹配全部已解析成功的简历
    if resume_ids:
        resumes = Resume.query.filter(Resume.id.in_(resume_ids), Resume.parsing_status == 'completed').all()
    else:
        resumes = Resume.query.filter_by(parsing_status='completed').all()
    
    print(f"tazlyx debug: Matching {len(resumes)} resumes to job: {job.title}")
    
    job_data = job.to_dict()
    matched_count = 0
    results = []
    
    for resume in resumes:
        # 检查是否已存在申请记录
        existing = JobApplication.query.filter_by(job_id=job_id, resume_id=resume.id).first()
        
        # 如果设置了跳过已有记录，则跳过匹配
        if existing and data.get('skip_existing', False):
            results.append(existing.to_dict())
            continue
        
        # 构造简历数据，用于 AI 匹配
        resume_data = {
            'skills': resume.ai_skills or [],
            'experience': resume.ai_experience or [],
            'education': resume.ai_education or [],
            'summary': resume.ai_summary or '',
            'city': (resume.ai_contact or {}).get('city', '')
        }
        
        contact = resume.ai_contact if isinstance(resume.ai_contact, dict) else {}
        print(f"tazlyx debug: Matching resume {resume.id} - {contact.get('name') if contact else 'Unknown'}")
        
        # 调用 AI 服务进行深度匹配分析
        matching_result = match_resume_to_job(resume_data, job_data)
        
        if existing:
            # 更新已有记录的多维度评分
            existing.matching_score = matching_result.get('matching_score', 0)
            existing.skill_score = matching_result.get('skill_score', 0)
            existing.experience_score = matching_result.get('experience_score', 0)
            existing.education_score = matching_result.get('education_score', 0)
            existing.ai_comment = matching_result.get('ai_comment', '')
            existing.matching_data = matching_result.get('matching_data', {})
            application = existing
        else:
            # 创建新的岗位申请记录
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
    
    try:
        matching_manager = get_matching_manager()
        matching_manager.clear_matching(job_id)
    except Exception as e:
        print(f"tazlyx debug: Failed to clear matching state in Redis: {e}")
    
    # 发送 WebSocket 通知，告知前端匹配完成
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
    """
    获取指定岗位的候选人列表，支持复杂的筛选和排序
    筛选维度包括：分数区间、状态、城市、技能关键词
    排序维度包括：匹配总分、技能分、经验分、教育分、创建时间
    """
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    # 解析筛选参数
    min_score = request.args.get('min_score', type=float)
    max_score = request.args.get('max_score', type=float)
    status = request.args.get('status')
    city = request.args.get('city')
    skill = request.args.get('skill')
    sort_by = request.args.get('sort_by', 'matching_score')
    sort_order = request.args.get('sort_order', 'desc')
    
    query = JobApplication.query.filter_by(job_id=job_id)
    
    # 应用筛选逻辑
    if min_score is not None:
        query = query.filter(JobApplication.matching_score >= min_score)
    if max_score is not None:
        query = query.filter(JobApplication.matching_score <= max_score)
    if status:
        query = query.filter_by(status=status)
    if city:
        query = query.filter(JobApplication.applicant_city.ilike(f'%{city}%'))
    
    # 应用动态排序逻辑
    sort_attr = getattr(JobApplication, sort_by, JobApplication.matching_score)
    if sort_order == 'desc':
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    candidates = []
    for app in pagination.items:
        app_dict = app.to_dict()
        # 后过滤：检查技能关键词
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
    """获取岗位候选人的详细匹配评估信息"""
    application = JobApplication.query.filter_by(id=application_id, job_id=job_id).first()
    
    if not application:
        return jsonify({'error': 'Candidate not found'}), 404
    
    return jsonify({'candidate': application.to_dict()})


@bp.route('/<int:job_id>/candidates/<int:application_id>/status', methods=['PUT'])
@jwt_required()
def update_candidate_status(job_id, application_id):
    """更新候选人在特定岗位下的处理状态（如：面试中、已入职等）"""
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
    """获取所有岗位的候选人（跨岗位筛选，用于全局人才池管理）"""
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
    
    # 动态排序
    sort_attr = getattr(JobApplication, sort_by, JobApplication.matching_score)
    if sort_order == 'desc':
        query = query.order_by(sort_attr.desc())
    else:
        query = query.order_by(sort_attr.asc())
    
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
    """获取全局候选人详情（包含简历完整信息及文件路径）"""
    application = JobApplication.query.get(application_id)
    
    if not application:
        return jsonify({'error': 'Candidate not found'}), 404
    
    result = application.to_dict()
    result['resume']['file_path'] = application.resume.file_path if application.resume else None
    
    return jsonify({'candidate': result})


@bp.route('/candidates/<int:application_id>/status', methods=['PUT'])
@jwt_required()
def update_candidate_status_global(application_id):
    """更新全局候选人状态"""
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
    """批量更新候选人处理状态（用于 HR 批量通过或拒绝申请）"""
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
    
    # 执行批量更新操作
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
    """对比多个候选人的评分（选择 2-3 人并排展示其各项评分指标）"""
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
