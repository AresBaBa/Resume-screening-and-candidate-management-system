import redis
import json
from flask import current_app
from typing import Optional, Dict, Any

class MatchingStateManager:
    """
    匹配状态管理器
    用于在Redis中存储和管理岗位的AI匹配状态
    状态包括：matching（匹配中）、completed（匹配完成）
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.key_prefix = 'job:matching:'
    
    def _get_key(self, job_id: int) -> str:
        """生成Redis键名"""
        return f"{self.key_prefix}{job_id}"
    
    def set_matching(self, job_id: int, user_id: int) -> bool:
        """
        设置岗位为匹配中状态
        :param job_id: 岗位ID
        :param user_id: 发起匹配的用户ID
        :return: 是否设置成功
        """
        try:
            key = self._get_key(job_id)
            state_data = {
                'status': 'matching',
                'user_id': user_id,
                'started_at': __import__('datetime').datetime.now().isoformat()
            }
            self.redis.setex(key, 3600, json.dumps(state_data))
            print(f"tazlyx debug: Set job {job_id} matching state in Redis")
            return True
        except Exception as e:
            print(f"tazlyx debug: Failed to set matching state: {e}")
            return False
    
    def clear_matching(self, job_id: int) -> bool:
        """
        清除岗位的匹配状态（匹配完成时调用）
        :param job_id: 岗位ID
        :return: 是否清除成功
        """
        try:
            key = self._get_key(job_id)
            self.redis.delete(key)
            print(f"tazlyx debug: Cleared matching state for job {job_id}")
            return True
        except Exception as e:
            print(f"tazlyx debug: Failed to clear matching state: {e}")
            return False
    
    def get_matching_state(self, job_id: int) -> Optional[Dict[str, Any]]:
        """
        获取岗位的匹配状态
        :param job_id: 岗位ID
        :return: 匹配状态信息，如果不存在则返回None
        """
        try:
            key = self._get_key(job_id)
            data = self.redis.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"tazlyx debug: Failed to get matching state: {e}")
            return None
    
    def is_matching(self, job_id: int) -> bool:
        """
        检查岗位是否正在匹配中
        :param job_id: 岗位ID
        :return: 是否正在匹配
        """
        state = self.get_matching_state(job_id)
        return state is not None and state.get('status') == 'matching'
    
    def get_matching_jobs(self, job_ids: list) -> Dict[int, Dict[str, Any]]:
        """
        批量获取多个岗位的匹配状态
        :param job_ids: 岗位ID列表
        :return: 岗位ID到匹配状态的映射
        """
        result = {}
        for job_id in job_ids:
            state = self.get_matching_state(job_id)
            if state:
                result[job_id] = state
        return result


matching_manager = None

def get_matching_manager() -> MatchingStateManager:
    """获取匹配状态管理器实例"""
    global matching_manager
    if matching_manager is None:
        redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        redis_client = redis.from_url(redis_url)
        matching_manager = MatchingStateManager(redis_client)
    return matching_manager
