# WebSocket 路由模块：实现基于 Socket.io 的实时双向通信，用于解析进度推送、消息通知等
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from flask_jwt_extended import decode_token
from app import socketio

# 维护在线用户与其 Socket ID 的映射关系
connected_users = {}

@socketio.on('connect')
def handle_connect():
    """
    WebSocket 连接建立回调
    1. 从请求参数中提取 JWT Token
    2. 校验 Token 并在服务端记录 user_id 与 sid 的对应关系
    3. 将用户加入到以其 user_id 命名的专属房间，方便定向推送
    """
    token = request.args.get('token')
    if not token:
        return False
    
    try:
        decoded = decode_token(token)
        user_id = decoded['sub']
        connected_users[user_id] = request.sid
        join_room(f'user_{user_id}')
        print(f"tazlyx debug: User {user_id} connected, SID: {request.sid}")
        emit('connected', {'status': 'ok'})
    except Exception as e:
        print(f"tazlyx debug: WebSocket connection error: {e}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    """
    WebSocket 连接断开回调
    清理在线状态并退出所属房间
    """
    token = request.args.get('token')
    if token:
        try:
            decoded = decode_token(token)
            user_id = decoded['sub']
            if user_id in connected_users:
                del connected_users[user_id]
            leave_room(f'user_{user_id}')
            print(f"tazlyx debug: User {user_id} disconnected")
        except Exception as e:
            print(f"tazlyx debug: WebSocket disconnect error: {e}")

@socketio.on('subscribe')
def handle_subscribe(data):
    """加入特定职位的消息房间（用于实时查看该职位的简历匹配进度）"""
    job_id = data.get('job_id')
    if job_id:
        join_room(f'job_{job_id}')
        print(f"tazlyx debug: Subscribed to job_{job_id}")

@socketio.on('unsubscribe')
def handle_unsubscribe(data):
    """退出特定职位的消息房间"""
    job_id = data.get('job_id')
    if job_id:
        leave_room(f'job_{job_id}')
        print(f"tazlyx debug: Unsubscribed from job_{job_id}")

def send_notification(user_id, notification_type, title, message, job_id=None):
    """
    向指定用户发送实时通知
    :param user_id: 接收者用户ID
    :param notification_type: 通知类型 (info/success/error/match_complete)
    :param title: 通知标题
    :param message: 通知内容
    :param job_id: 可选，关联的职位ID
    """
    room = f'user_{user_id}'
    socketio.emit('notification', {
        'type': notification_type,
        'title': title,
        'message': message,
        'job_id': job_id,
        'createdAt': __import__('datetime').datetime.now().isoformat()
    }, room=room)
    print(f"tazlyx debug: Notification sent to user {user_id}: {title}")

def broadcast_job_notification(job_id, notification_type, title, message):
    """
    向所有订阅了该职位的用户（通常是 HR 团队）广播实时消息
    """
    room = f'job_{job_id}'
    socketio.emit('notification', {
        'type': notification_type,
        'title': title,
        'message': message,
        'job_id': job_id,
        'createdAt': __import__('datetime').datetime.now().isoformat()
    }, room=room)
    print(f"tazlyx debug: Broadcast to job_{job_id}: {title}")
