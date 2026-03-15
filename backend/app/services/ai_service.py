import os
import json
import re
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from typing import Dict, Any, Optional, List
from config import Config


class AIService:
    """AI 服务基类"""

    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        raise NotImplementedError


class OpenAICompatibleService(AIService):
    """OpenAI 兼容 API 服务（支持 DeepSeek、OpenAI、X.AI 等）"""

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.1),
            "max_tokens": kwargs.get("max_tokens", 2000),
            "stream": False
        }

        data = json.dumps(payload).encode("utf-8")
        req = Request(self.base_url, data=data, method="POST")
        req.add_header("Authorization", f"Bearer {self.api_key}")
        req.add_header("Content-Type", "application/json")

        print(f"tazlyx debug: AI Request - url: {self.base_url}, model: {self.model}")

        try:
            with urlopen(req, timeout=kwargs.get("timeout", 60)) as response:
                body = response.read().decode("utf-8", errors="ignore")
            
            result = json.loads(body)

            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0].get("message", {}).get("content", "")
                print(f"tazlyx debug: AI response received, length: {len(content)}")
                return content
            else:
                raise Exception(f"Invalid API response: {result}")

        except HTTPError as e:
            error_body = e.read().decode("utf-8", errors="ignore")
            print(f"tazlyx debug: AI API HTTP error - status: {e.code}, body: {error_body}")
            raise Exception(f"API HTTP error: {e.code} - {error_body}")
        except URLError as e:
            print(f"tazlyx debug: AI API URL error: {str(e)}")
            raise Exception(f"API URL error: {str(e)}")
        except Exception as e:
            print(f"tazlyx debug: AI API error: {str(e)}")
            raise Exception(f"API error: {str(e)}")


class AIServiceFactory:
    """AI 服务工厂 - 支持多平台切换"""

    _services = {}

    @classmethod
    def get_service(cls, provider: str = None) -> AIService:
        """获取 AI 服务实例
        
        Args:
            provider: AI 提供商名称，可选值:
                - deepseek (默认)
                - openai
                - anthropic
                - xai
        """
        if provider is None:
            provider = Config.AI_PROVIDER or 'deepseek'
        
        provider = provider.lower()
        
        if provider in cls._services:
            return cls._services[provider]

        if provider == "deepseek":
            api_key = Config.DEEPSEEK_API_KEY
            base_url = Config.DEEPSEEK_URL
            model = Config.DEEPSEEK_MODEL
        elif provider == "openai":
            api_key = Config.OPENAI_API_KEY
            base_url = "https://api.openai.com/v1/chat/completions"
            model = Config.OPENAI_MODEL
        elif provider == "anthropic":
            api_key = Config.ANTHROPIC_API_KEY
            base_url = "https://api.anthropic.com/v1/messages"
            model = Config.ANTHROPIC_MODEL
        elif provider == "xai":
            api_key = Config.XAI_API_KEY
            base_url = "https://api.x.ai/v1/chat/completions"
            model = Config.XAI_MODEL
        else:
            raise ValueError(f"Unsupported AI provider: {provider}")

        if not api_key:
            raise ValueError(f"API key not configured for {provider}")

        service = OpenAICompatibleService(api_key, base_url, model)
        cls._services[provider] = service
        return service

    @classmethod
    def get_current_provider(cls) -> str:
        """获取当前使用的 AI 提供商"""
        return Config.AI_PROVIDER or 'deepseek'

    @classmethod
    def clear_cache(cls):
        """清除服务缓存"""
        cls._services = {}


def parse_resume_with_ai_v2(raw_text: str) -> Dict[str, Any]:
    """使用 AI 解析简历文本"""
    print(f"tazlyx debug: Starting AI parsing, text length: {len(raw_text)}")

    if not raw_text:
        return {
            'raw_text': '',
            'structured': {},
            'error': 'No text to parse'
        }

    try:
        provider = AIServiceFactory.get_current_provider()
        print(f"tazlyx debug: Using AI provider: {provider}")
        
        service = AIServiceFactory.get_service(provider)

        prompt = f"""请从以下简历文本中提取结构化信息，返回纯JSON格式，不要添加任何解释或markdown标记：

简历文本:
{raw_text[:8000]}

请提取以下JSON字段（如果某项不存在则返回null或空数组）：
{{
    "name": "姓名",
    "email": "邮箱",
    "phone": "电话",
    "summary": "个人简介/求职意向",
    "skills": ["技能1", "技能2"],
    "experience": [
        {{"title": "职位名称", "company": "公司名称", "dates": "工作时间", "description": "工作描述"}}
    ],
    "education": [
        {{"degree": "学历", "school": "学校", "major": "专业", "dates": "时间"}}
    ]
}}

只返回JSON，不要有任何其他内容。"""

        messages = [
            {"role": "system", "content": "你是一个专业的简历解析助手，擅长从简历文本中提取结构化信息。"},
            {"role": "user", "content": prompt}
        ]

        print(f"tazlyx debug: Calling AI API...")
        content = service.chat(messages)

        print(f"tazlyx debug: AI response: {content[:200]}...")

        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            structured = json.loads(json_match.group())
            print(f"tazlyx debug: Parsed structured data: {list(structured.keys())}")
            return {
                'raw_text': raw_text,
                'structured': structured
            }
        else:
            print("tazlyx debug: No JSON found in AI response")
            return {
                'raw_text': raw_text,
                'structured': {}
            }

    except Exception as e:
        print(f"tazlyx debug: AI parsing error: {str(e)}")
        import traceback
        print(f"tazlyx debug: Traceback: {traceback.format_exc()}")
        return {
            'raw_text': raw_text,
            'structured': {},
            'error': str(e)
        }
