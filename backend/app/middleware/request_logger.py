from flask import request, g
import time
import logging

logger = logging.getLogger(__name__)


def setup_request_logging(app):
    """设置请求日志记录"""
    
    @app.before_request
    def before_request():
        """请求开始前记录时间"""
        g.start_time = time.time()
        print(f"tazlyx debug: {request.method} {request.path} - 请求开始")
    
    @app.after_request
    def after_request(response):
        """请求结束后记录耗时"""
        if hasattr(g, 'start_time'):
            elapsed = time.time() - g.start_time
            status_code = response.status_code
            
            if status_code >= 400:
                print(f"tazlyx error: {request.method} {request.path} - 耗时 {elapsed:.3f}s - 状态码 {status_code}")
            else:
                print(f"tazlyx debug: {request.method} {request.path} - 耗时 {elapsed:.3f}s - 状态码 {status_code}")
        
        return response
