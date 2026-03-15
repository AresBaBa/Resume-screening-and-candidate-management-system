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
    "gender": "性别",
    "birthday": "生日/年龄",
    "email": "邮箱",
    "phone": "电话",
    "city": "所在城市（重要：如果简历中明确提到期望工作城市、求职意向中的城市、或现居城市，这些都属于所在城市。请务必从以下位置查找：1.简历顶部的个人信息 2.求职意向 3.个人简介 4.任何提及城市的地方。如果实在找不到返回null。）",
    "summary": "个人简介/求职意向（包含期望城市、期望薪资、岗位等信息）",
    "skills": ["技能1", "技能2"],
    "experience": [
        {{"title": "职位名称", "company": "公司名称", "dates": "工作时间", "description": "工作描述"}}
    ],
    "education": [
        {{"degree": "学历", "school": "学校", "major": "专业", "graduation_date": "毕业时间"}}
    ],
    "projects": [
        {{"name": "项目名称", "role": "个人职责", "tech": "技术栈", "description": "项目描述"}}
    ],
    "score": "综合评分(0-100整数，根据教育背景、工作经验、技能匹配度、项目经历等进行客观评分)"
}}

只返回JSON，不要有任何其他内容。"""

        messages = [
            {"role": "system", "content": "你是一个专业的简历解析助手，擅长从简历文本中提取结构化信息。你需要从简历中准确提取个人信息，包括姓名、联系方式、教育背景、工作经验、技能等。对于城市信息，你需要从求职意向、个人简介或任何提及的位置查找。务必返回完整、准确的JSON数据。"},
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


def match_resume_to_job(resume_data: Dict[str, Any], job_data: Dict[str, Any]) -> Dict[str, Any]:
    """使用 AI 分析简历与岗位的匹配度
    
    Args:
        resume_data: 简历结构化数据
        job_data: 岗位数据
    
    Returns:
        匹配评分结果，包含综合评分、各维度评分和AI评语
    """
    print(f"tazlyx debug: Starting job-resume matching analysis")
    
    try:
        provider = AIServiceFactory.get_current_provider()
        print(f"tazlyx debug: Using AI provider: {provider}")
        
        service = AIServiceFactory.get_service(provider)
        
        resume_skills = resume_data.get('skills', [])
        resume_experience = resume_data.get('experience', [])
        resume_education = resume_data.get('education', [])
        resume_summary = resume_data.get('summary', '')
        resume_city = resume_data.get('city', '')
        
        job_title = job_data.get('title', '')
        job_description = job_data.get('description', '')
        job_skills_required = job_data.get('skills_required', [])
        job_skills_preferred = job_data.get('skills_preferred', [])
        job_requirements = job_data.get('requirements', {})
        
        prompt = f"""你是一个专业的HR招聘助手，擅长评估候选人与岗位的匹配度。请根据以下信息进行评估并返回JSON格式结果。

## 岗位信息
- 岗位名称: {job_title}
- 岗位描述: {job_description[:2000]}
- 必备技能: {json.dumps(job_skills_required, ensure_ascii=False) if job_skills_required else '无'}
- 加分技能: {json.dumps(job_skills_preferred, ensure_ascii=False) if job_skills_preferred else '无'}
- 其他要求: {json.dumps(job_requirements, ensure_ascii=False) if job_requirements else '无'}

## 简历信息
- 个人简介: {resume_summary[:500]}
- 技能列表: {json.dumps(resume_skills, ensure_ascii=False) if resume_skills else '无'}
- 工作经验: {json.dumps(resume_experience[:3], ensure_ascii=False) if resume_experience else '无'}
- 教育背景: {json.dumps(resume_education[:2], ensure_ascii=False) if resume_education else '无'}
- 所在城市: {resume_city}

请评估以上简历与岗位的匹配程度，返回以下JSON格式（只返回JSON，不要有任何其他内容）:
{{
    "matching_score": 综合匹配度评分(0-100整数),
    "skill_score": 技能匹配度评分(0-100整数),
    "experience_score": 经验相关性评分(0-100整数),
    "education_score": 教育背景契合度评分(0-100整数),
    "ai_comment": "一段文字说明该候选人的优势与不足（100-200字）",
    "matching_data": {{
        "matched_skills": ["匹配的技能列表"],
        "missing_skills": ["缺失的必备技能"],
        "preferred_skills": ["已具备的加分技能"],
        "experience_match": "经验匹配说明",
        "education_match": "学历匹配说明"
    }}
}}

注意：
1. matching_score是综合评分，应该结合技能、经验、教育三个维度综合考虑
2. 如果简历缺少必备技能，matching_score应该相应降低
3. 如果简历具备加分技能，matching_score应该适当提升
4. 只返回JSON，不要添加任何解释或markdown标记"""

        messages = [
            {"role": "system", "content": "你是一个专业的HR招聘助手，擅长评估候选人与岗位的匹配度。请根据简历和岗位信息进行客观评估。"},
            {"role": "user", "content": prompt}
        ]

        print(f"tazlyx debug: Calling AI matching API...")
        content = service.chat(messages)

        print(f"tazlyx debug: AI matching response: {content[:200]}...")

        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            result = json.loads(json_match.group())
            print(f"tazlyx debug: Parsed matching result: skill_score={result.get('skill_score')}, experience_score={result.get('experience_score')}, education_score={result.get('education_score')}, matching_score={result.get('matching_score')}")
            return result
        else:
            print("tazlyx debug: No JSON found in AI matching response")
            return {
                'matching_score': 0,
                'skill_score': 0,
                'experience_score': 0,
                'education_score': 0,
                'ai_comment': 'AI评分失败',
                'matching_data': {}
            }

    except Exception as e:
        print(f"tazlyx debug: AI matching error: {str(e)}")
        import traceback
        print(f"tazlyx debug: Traceback: {traceback.format_exc()}")
        return {
            'matching_score': 0,
            'skill_score': 0,
            'experience_score': 0,
            'education_score': 0,
            'ai_comment': f'评分出错: {str(e)}',
            'matching_data': {}
        }
