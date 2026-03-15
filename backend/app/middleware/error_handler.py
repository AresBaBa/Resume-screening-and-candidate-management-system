from flask import jsonify
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.exceptions import APIException


def register_error_handlers(app):
    """注册全局错误处理器"""
    
    @app.errorhandler(APIException)
    def handle_api_exception(error):
        """处理自定义 API 异常"""
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        print(f"tazlyx error: APIException - {error.message} (status: {error.status_code})")
        return response
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        """处理 400 错误"""
        print(f"tazlyx error: Bad Request - {error.description}")
        return jsonify({
            'error': 'BadRequest',
            'message': error.description or '请求参数无效'
        }), 400
    
    @app.errorhandler(401)
    def handle_unauthorized(error):
        """处理 401 错误"""
        print(f"tazlyx error: Unauthorized - {error.description}")
        return jsonify({
            'error': 'Unauthorized',
            'message': error.description or '未授权，请先登录'
        }), 401
    
    @app.errorhandler(403)
    def handle_forbidden(error):
        """处理 403 错误"""
        print(f"tazlyx error: Forbidden - {error.description}")
        return jsonify({
            'error': 'Forbidden',
            'message': error.description or '没有权限访问此资源'
        }), 403
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """处理 404 错误"""
        print(f"tazlyx error: Not Found - {error.description}")
        return jsonify({
            'error': 'NotFound',
            'message': error.description or '请求的资源不存在'
        }), 404
    
    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """处理 405 错误"""
        print(f"tazlyx error: Method Not Allowed - {error.description}")
        return jsonify({
            'error': 'MethodNotAllowed',
            'message': error.description or '不支持的请求方法'
        }), 405
    
    @app.errorhandler(429)
    def handle_rate_limit(error):
        """处理 429 错误（请求频率超限）"""
        print(f"tazlyx error: Rate Limit Exceeded - {error.description}")
        return jsonify({
            'error': 'RateLimitError',
            'message': error.description or '请求过于频繁，请稍后再试'
        }), 429
    
    @app.errorhandler(500)
    def handle_internal_server_error(error):
        """处理 500 错误"""
        print(f"tazlyx error: Internal Server Error - {error.description}")
        return jsonify({
            'error': 'InternalServerError',
            'message': '服务器内部错误，请稍后再试'
        }), 500
    
    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        """处理数据库错误"""
        print(f"tazlyx error: Database Error - {str(error)}")
        return jsonify({
            'error': 'DatabaseError',
            'message': '数据库操作失败，请稍后再试'
        }), 500
    
    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        """处理数据完整性错误"""
        print(f"tazlyx error: Integrity Error - {str(error)}")
        return jsonify({
            'error': 'IntegrityError',
            'message': '数据冲突，请检查输入是否重复'
        }), 409
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """处理其他 HTTP 异常"""
        print(f"tazlyx error: HTTP Exception - {error.description} (code: {error.code})")
        return jsonify({
            'error': error.name,
            'message': error.description
        }), error.code
    
    @app.errorhandler(Exception)
    def handle_unexpected_exception(error):
        """处理所有未预期的异常"""
        print(f"tazlyx error: Unexpected Exception - {str(error)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'InternalServerError',
            'message': '服务器发生未知错误，请稍后再试'
        }), 500
