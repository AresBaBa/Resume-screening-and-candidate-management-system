from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Candidate

bp = Blueprint('candidates', __name__, url_prefix='/api/candidates')


@bp.route('', methods=['GET'])
@jwt_required()
def get_candidates():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    
    query = Candidate.query
    
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(Candidate.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'candidates': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages
    })


@bp.route('/<int:candidate_id>', methods=['GET'])
@jwt_required()
def get_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    
    if not candidate:
        return jsonify({'error': 'Candidate not found'}), 404
    
    return jsonify({'candidate': candidate.to_dict()})


@bp.route('/<int:candidate_id>', methods=['PUT'])
@jwt_required()
def update_candidate(candidate_id):
    candidate = Candidate.query.get(candidate_id)
    
    if not candidate:
        return jsonify({'error': 'Candidate not found'}), 404
    
    data = request.get_json()
    
    if 'skills' in data:
        candidate.skills = data['skills']
    if 'experience_years' in data:
        candidate.experience_years = data['experience_years']
    if 'education' in data:
        candidate.education = data['education']
    if 'status' in data:
        candidate.status = data['status']
    
    db.session.commit()
    
    return jsonify({'candidate': candidate.to_dict()})


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.candidate:
        return jsonify({'error': 'Candidate profile not found'}), 404
    
    return jsonify({'candidate': user.candidate.to_dict()})


@bp.route('/me', methods=['PUT'])
@jwt_required()
def update_my_profile():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user or not user.candidate:
        return jsonify({'error': 'Candidate profile not found'}), 404
    
    candidate = user.candidate
    data = request.get_json()
    
    if 'skills' in data:
        candidate.skills = data['skills']
    if 'experience_years' in data:
        candidate.experience_years = data['experience_years']
    if 'education' in data:
        candidate.education = data['education']
    if 'phone' in data:
        user.phone = data['phone']
    
    db.session.commit()
    
    return jsonify({'candidate': candidate.to_dict()})
