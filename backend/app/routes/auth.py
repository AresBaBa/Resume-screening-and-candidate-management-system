from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app import db
from app.models import User

# 身份认证路由模块：处理用户注册、登录、Token 刷新及个人信息管理
bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/register', methods=['POST'])
def register():
    """
    用户注册接口
    1. 检查邮箱是否已被注册
    2. 创建新用户并加密存储密码
    3. 生成并返回访问令牌(Access Token)和刷新令牌(Refresh Token)
    """
    data = request.get_json()
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
    
    user = User(
        email=data['email'],
        name=data['name'],
        phone=data.get('phone')
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    return jsonify({
        'message': 'User registered successfully',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201


@bp.route('/login', methods=['POST'])
def login():
    """
    用户登录接口
    校验邮箱和密码，成功后返回双 Token
    """
    data = request.get_json()
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    })


@bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """
    刷新 Access Token
    需要携带有效的 Refresh Token 访问
    """
    current_user_id = int(get_jwt_identity())
    access_token = create_access_token(identity=str(current_user_id))
    
    return jsonify({'access_token': access_token})


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """获取当前登录用户的详细资料"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()})


@bp.route('/me', methods=['PUT'])
@jwt_required()
def update_current_user():
    """更新当前登录用户的个人信息（姓名、电话、头像等）"""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'name' in data:
        user.name = data['name']
    if 'phone' in data:
        user.phone = data['phone']
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url']
    
    db.session.commit()
    
    return jsonify({'user': user.to_dict()})


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Logout successful'})
