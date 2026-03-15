class APIException(Exception):
    """API 基础异常类"""
    status_code = 400
    
    def __init__(self, message, status_code=None, payload=None):
        super().__init__()
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload
    
    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        rv['error'] = self.__class__.__name__
        return rv


class ValidationError(APIException):
    """数据验证错误"""
    status_code = 400


class AuthenticationError(APIException):
    """认证错误"""
    status_code = 401


class AuthorizationError(APIException):
    """权限错误"""
    status_code = 403


class NotFoundError(APIException):
    """资源不存在"""
    status_code = 404


class ConflictError(APIException):
    """资源冲突"""
    status_code = 409


class RateLimitError(APIException):
    """请求频率超限"""
    status_code = 429


class ExternalServiceError(APIException):
    """外部服务错误"""
    status_code = 502
