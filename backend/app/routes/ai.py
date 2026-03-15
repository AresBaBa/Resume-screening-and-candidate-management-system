from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, cache
from app.models import Resume, Job, User
from config import Config

bp = Blueprint('ai', __name__, url_prefix='/api/ai')


def get_openai_client():
    from openai import OpenAI
    return OpenAI(api_key=Config.OPENAI_API_KEY)


@bp.route('/parse-resume/<int:resume_id>', methods=['POST'])
@jwt_required()
def parse_resume(resume_id):
    user_id = int(get_jwt_identity())
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    if resume.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if not resume.parsed_data:
        resume.parsing_status = 'processing'
        db.session.commit()
        
        try:
            client = get_openai_client()
            with open(resume.file_path, 'rb') as f:
                response = client.files.create(
                    file=f,
                    purpose='assistants'
                )
            
            resume.parsed_data = {
                'file_id': response.id,
                'status': 'uploaded'
            }
            resume.parsing_status = 'completed'
            db.session.commit()
            
        except Exception as e:
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
    user_id = int(get_jwt_identity())
    resume = Resume.query.get(resume_id)
    data = request.get_json()
    job_id = data.get('job_id')
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    job = None
    if job_id:
        job = Job.query.get(job_id)
    
    prompt = f"""
    Please evaluate this candidate's resume.
    """
    
    if job:
        prompt += f"""
    Job Position: {job.title}
    Job Description: {job.description}
    Required Skills: {', '.join(job.skills_required or [])}
    Requirements: {job.requirements}
    """
    
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
        
        import re
        score_match = re.search(r'\b([0-9]{1,2}|100)\b', feedback)
        score = float(score_match.group(1)) if score_match else 50.0
        
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
@cache.cached(timeout=3600)
def generate_interview_questions(job_id):
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
    job = Job.query.get(job_id)
    
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    
    resumes = Resume.query.filter_by(parsing_status='completed').all()
    
    if not resumes:
        return jsonify({'matches': [], 'message': 'No parsed resumes found'}), 200
    
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
