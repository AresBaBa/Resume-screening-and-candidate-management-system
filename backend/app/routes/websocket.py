from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
from flask_jwt_extended import decode_token
from app import socketio

connected_users = {}

@socketio.on('connect')
def handle_connect():
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
    job_id = data.get('job_id')
    if job_id:
        join_room(f'job_{job_id}')
        print(f"tazlyx debug: Subscribed to job_{job_id}")

@socketio.on('unsubscribe')
def handle_unsubscribe(data):
    job_id = data.get('job_id')
    if job_id:
        leave_room(f'job_{job_id}')
        print(f"tazlyx debug: Unsubscribed from job_{job_id}")

def send_notification(user_id, notification_type, title, message, job_id=None):
    """Send notification to a specific user"""
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
    """Broadcast notification to all users subscribed to a job"""
    room = f'job_{job_id}'
    socketio.emit('notification', {
        'type': notification_type,
        'title': title,
        'message': message,
        'job_id': job_id,
        'createdAt': __import__('datetime').datetime.now().isoformat()
    }, room=room)
    print(f"tazlyx debug: Broadcast to job_{job_id}: {title}")
