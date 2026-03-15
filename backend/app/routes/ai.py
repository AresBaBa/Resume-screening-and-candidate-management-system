from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from openai import OpenAI
from app import db, cache
from app.models import Resume, Application, Job
from config import Config

bp = Blueprint('ai', __name__, url_prefix='/api/ai')

client = OpenAI(api_key=Config.OPENAI_API_KEY)


@bp.route('/parse-resume/<int:resume_id>', methods=['POST'])
@jwt_required()
@cache.cached(timeout=3600, query_string=True)
def parse_resume(resume_id):
    resume = Resume.query.get(resume_id)
    
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    if not resume.parsed_data:
        resume.parsing_status = 'processing'
        db.session.commit()
        
        try:
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


@bp.route('/score-application/<int:application_id>', methods=['POST'])
@jwt_required()
def score_application(application_id):
    application = Application.query.get(application_id)
    
    if not application:
        return jsonify({'error': 'Application not found'}), 404
    
    job = application.job
    candidate = application.candidate
    resume = application.resume
    
    if not job or not candidate:
        return jsonify({'error': 'Job or candidate not found'}), 404
    
    prompt = f"""
    Please evaluate this candidate for the position of {job.title}.
    
    Job Requirements:
    - Description: {job.description}
    - Required Skills: {', '.join(job.skills_required or [])}
    - Requirements: {job.requirements}
    
    Candidate Profile:
    - Skills: {', '.join(candidate.skills or [])}
    - Experience: {candidate.experience_years} years
    - Education: {candidate.education}
    
    Resume Summary: {resume.ai_summary if resume else 'N/A'}
    Resume Skills: {', '.join(resume.ai_skills or []) if resume else 'N/A'}
    
    Please provide:
    1. A score from 0-100
    2. Detailed feedback
    3. Strengths and weaknesses
    """
    
    try:
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
        
        application.ai_score = score
        application.ai_feedback = feedback
        db.session.commit()
        
        return jsonify({
            'application': application.to_dict(),
            'message': 'Application scored successfully'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to score application: {str(e)}'}), 500


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
