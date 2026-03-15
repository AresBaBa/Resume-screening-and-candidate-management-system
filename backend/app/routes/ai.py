from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, cache
from app.models import Resume, Job, User
from config import Config

# AI 路由模块：处理简历解析、评分、面试问题生成及职位匹配等 AI 相关功能
bp = Blueprint('ai', __name__, url_prefix='/api/ai')


def get_openai_client():
    """获取 OpenAI 客户端实例，从配置中读取 API Key"""
    from openai import OpenAI
    return OpenAI(api_key=Config.OPENAI_API_KEY)


@bp.route('/parse-resume/<int:resume_id>', methods=['POST'])
@jwt_required()
def parse_resume(resume_id):
    """
    手动触发 AI 解析指定简历（用于管理员或 HR 重新处理简历）
    """
    user_id = int(get_jwt_identity())
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    # 权限检查：仅允许简历所有者或管理员操作
    if resume.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # 如果简历尚未解析过原始数据
    if not resume.parsed_data:
        resume.parsing_status = 'processing'
        db.session.commit()
        
        try:
            client = get_openai_client()
            # 上传文件到 OpenAI 的 Assistants API 平台
            with open(resume.file_path, 'rb') as f:
                response = client.files.create(
                    file=f,
                    purpose='assistants'
                )
            
            # 记录文件 ID 以备后续 Assistant 引用
            resume.parsed_data = {
                'file_id': response.id,
                'status': 'uploaded'
            }
            resume.parsing_status = 'completed'
            db.session.commit()
            
        except Exception as e:
            # 记录解析失败状态
            resume.parsing_status = 'failed'
            db.session.commit()
            return jsonify({'error': f'Failed to parse resume: {str(e)}'}), 500
    
    return jsonify({
        'resume': resume.to_dict(),
        'message': 'Resume parsed successfully'
    })


@bp.route('/score-resume/<int:resume_id>', methods=['POST'])
@jwt_required()
def score_resume(resume_id):
    """
    根据指定职位（Job）对简历进行 AI 评分和反馈生成
    """
    user_id = int(get_jwt_identity())
    resume = Resume.query.get(resume_id)
    data = request.get_json()
    job_id = data.get('job_id')
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    job = None
    if job_id:
        job = Job.query.get(job_id)
    
    # 构造 AI 提示词 (Prompt)
    prompt = f"""
    Please evaluate this candidate's resume.
    """
    
    # 如果提供了职位信息，则进行针对性的匹配评估
    if job:
        prompt += f"""
    Job Position: {job.title}
    Job Description: {job.description}
    Required Skills: {', '.join(job.skills_required or [])}
    Requirements: {job.requirements}
    """
    
    # 传入已提取的简历关键信息
    prompt += f"""
    Resume Summary: {resume.ai_summary if resume.ai_summary else 'N/A'}
    Resume Skills: {', '.join(resume.ai_skills or []) if resume.ai_skills else 'N/A'}
    Resume Experience: {resume.ai_experience if resume.ai_experience else 'N/A'}
    Resume Education: {resume.ai_education if resume.ai_education else 'N/A'}
    
    Please provide:
    1. A score from 0-100
    2. Detailed feedback
    3. Strengths and weaknesses
    """
    
    try:
        client = get_openai_client()
        # 调用 GPT-4 模型进行评估
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a professional HR recruiter evaluating job candidates."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        feedback = response.choices[0].message.content
        
        # 从 AI 回复中通过正则提取 0-100 的分数
        import re
        score_match = re.search(r'\b([0-9]{1,2}|100)\b', feedback)
        score = float(score_match.group(1)) if score_match else 50.0
        
        # 更新简历的 AI 评分和反馈
        resume.ai_score = score
        resume.ai_feedback = feedback
        db.session.commit()
        
        return jsonify({
            'resume': resume.to_dict(),
            'message': 'Resume scored successfully'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to score resume: {str(e)}'}), 500


@bp.route('/generate-interview-questions/<int:job_id>', methods=['GET'])
@jwt_required()
@cache.cached(timeout=3600) # 缓存 1 小时，避免重复消耗 Token
def generate_interview_questions(job_id):
    """
    根据职位描述自动生成面试问题
    """
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    prompt = f"""
    Generate 10 interview questions for the position of {job.title}.
    
    Job Description: {job.description}
    Required Skills: {', '.join(job.skills_required or [])}
    Requirements: {job.requirements}
    
    Please provide a mix of:
    - Technical questions
    - Behavioral questions
    - Situational questions
    """
    
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a professional HR recruiter."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        questions = response.choices[0].message.content
        
        return jsonify({
            'job_id': job_id,
            'questions': questions
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to generate questions: {str(e)}'}), 500


@bp.route('/match-resumes/<int:job_id>', methods=['GET'])
@jwt_required()
def match_resumes(job_id):
    """
    针对某个职位，从简历库中筛选并排名最匹配的候选人
    """
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    # 获取所有已解析成功的简历
    resumes = Resume.query.filter_by(parsing_status='completed').all()
    
    if not resumes:
        return jsonify({'matches': [], 'message': 'No parsed resumes found'}), 200
    
    # 构造批量匹配 Prompt
    prompt = f"""
    Please match the following resumes to the job position: {job.title}
    
    Job Description: {job.description}
    Required Skills: {', '.join(job.skills_required or [])}
    Requirements: {job.requirements}
    
    Resumes:
    """
    
    for i, resume in enumerate(resumes):
        prompt += f"""
    {i+1}. {resume.file_name}
       Summary: {resume.ai_summary if resume.ai_summary else 'N/A'}
       Skills: {', '.join(resume.ai_skills or []) if resume.ai_skills else 'N/A'}
       Experience: {resume.ai_experience if resume.ai_experience else 'N/A'}
    """
    
    prompt += """
    Please provide a ranked list of resumes with scores (0-100) and brief reasons for each match.
    Format the response as JSON with the following structure:
    [{"resume_id": 1, "score": 85, "reason": "..."}]
    """
    
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a professional HR recruiter matching resumes to jobs."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        import json
        import re
        
        content = response.choices[0].message.content
        # 从 AI 回复中提取 JSON 数组部分
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        
        if json_match:
            matches = json.loads(json_match.group())
        else:
            matches = []
        
        return jsonify({
            'job_id': job_id,
            'matches': matches,
            'total_resumes': len(resumes)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to match resumes: {str(e)}'}), 500


@bp.route('/chat', methods=['POST'])
@jwt_required()
def chat():
    """
    AI 助手聊天接口，支持职位上下文关联
    """
    data = request.get_json()
    message = data.get('message', '')
    context = data.get('context', {})
    
    system_prompt = """You are an AI assistant for a resume screening and candidate management system. 
    You can help users with:
    - Understanding job descriptions
    - Resume writing tips
    - Interview preparation
    - Career advice
    - System usage questions
    
    Please provide helpful and professional responses."""
    
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    # 如果聊天时带有 job_id，则将该职位的背景信息加入上下文
    if context.get('job_id'):
        job = Job.query.get(context['job_id'])
        if job:
            messages.append({
                "role": "system",
                "content": f"Current job context: {job.title} - {job.description}"
            })
    
    messages.append({"role": "user", "content": message})
    
    try:
        client = get_openai_client()
        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        return jsonify({
            'response': response.choices[0].message.content
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get response: {str(e)}'}), 500
