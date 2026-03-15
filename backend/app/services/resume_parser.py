import re
import json
import pdfplumber
import fitz
import os
from io import BytesIO
from PIL import Image
from typing import Dict, List, Optional, Any

from dotenv import load_dotenv
load_dotenv()
from config import Config
from app.services.ai_service import AIServiceFactory


class ResumeParser:
    def __init__(self):
        self.name_patterns = [
            r'^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)$',
            r'^([A-Z][a-z]+(?:\s[A-Z]\.?\s?[A-Z][a-z]+)+)$',
        ]
        
    def parse_pdf(self, file_path: str) -> Dict[str, Any]:
        result = {
            'raw_text': '',
            'pages': 0,
            'structured': {}
        }
        
        try:
            with pdfplumber.open(file_path) as pdf:
                result['pages'] = len(pdf.pages)
                
                all_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        all_text.append(text)
                
                result['raw_text'] = '\n\n'.join(all_text)
                result['structured'] = self._structure_resume(result['raw_text'])
                
        except Exception as e:
            result['error'] = str(e)
            
        return result
    
    def parse_docx(self, file_path: str) -> Dict[str, Any]:
        from docx import Document
        
        result = {
            'raw_text': '',
            'pages': 1,
            'structured': {}
        }
        
        try:
            doc = Document(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            result['raw_text'] = '\n\n'.join(paragraphs)
            result['structured'] = self._structure_resume(result['raw_text'])
        except Exception as e:
            result['error'] = str(e)
            
        return result
    
    def _structure_resume(self, text: str) -> Dict[str, Any]:
        structured = {
            'name': self._extract_name(text),
            'email': self._extract_email(text),
            'phone': self._extract_phone(text),
            'summary': self._extract_summary(text),
            'experience': self._extract_experience(text),
            'education': self._extract_education(text),
            'skills': self._extract_skills(text),
        }
        return structured
    
    def _extract_name(self, text: str) -> Optional[str]:
        lines = text.strip().split('\n')
        if lines:
            first_line = lines[0].strip()
            if 2 <= len(first_line) <= 10 and not any(c in first_line for c in ['@', '电话', '邮箱', '求职意向', '年龄']):
                if re.match(r'^[\u4e00-\u9fa5]{2,10}$', first_line):
                    return first_line
        
        name_match = re.search(r'^([\u4e00-\u9fa5]{2,4})\s*[\u4e00-\u9fa5]', text)
        if name_match:
            return name_match.group(1)
        
        return None
    
    def _extract_email(self, text: str) -> Optional[str]:
        email_patterns = [
            r'[\u4e00-\u9fa5a-zA-Z0-9._%+-]+@[\u4e00-\u9fa5a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            r'b415189417@163\.com'
        ]
        for pattern in email_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0)
        return None
    
    def _extract_phone(self, text: str) -> Optional[str]:
        phone_patterns = [
            r'1[3-9]\d{9}',
            r'\d{3,4}[-\s]?\d{7,8}',
            r'\d{11}',
        ]
        for pattern in phone_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0)
        return None
    
    def _extract_summary(self, text: str) -> Optional[str]:
        summary_keywords = ['求职意向', '个人简介', 'summary', 'objective']
        
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line_lower = line.lower().replace(' ', '')
            if any(keyword in line_lower for keyword in summary_keywords):
                summary_lines = []
                for j in range(i + 1, min(i + 4, len(lines))):
                    if lines[j].strip() and not any(kw in lines[j] for kw in ['专业技能', '工作经验', '教育背景', '项目经验']):
                        summary_lines.append(lines[j].strip())
                    else:
                        break
                if summary_lines:
                    return ' '.join(summary_lines[:2])
        return None
    
    def _extract_experience(self, text: str) -> List[Dict[str, str]]:
        experience = []
        
        exp_sections = re.split(r'工作经验|项目经验', text)
        
        for section_idx, section in enumerate(exp_sections[1:6], 1):
            lines = section.split('\n')
            current_exp = {}
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                if any(kw in line for kw in ['教育背景', '专业技能', '项目经验']):
                    break
                
                date_match = re.search(r'(\d{4}[-\s]?\d{0,2})\s*[~\-至]\s*(\d{4}[-\s]?\d{0,2}|今|今)', line)
                if date_match:
                    if 'dates' not in current_exp:
                        current_exp['dates'] = line[:20]
                
                if any(title in line for title in ['Java开发', '前端', '后端', '开发', '测试', '设计']):
                    if 'title' not in current_exp:
                        current_exp['title'] = line[:30]
                    elif 'company' not in current_exp:
                        current_exp['company'] = line[:30]
                elif 'company' not in current_exp and current_exp.get('title'):
                    if len(line) < 30:
                        current_exp['company'] = line
                
                if 'description' not in current_exp:
                    if line.startswith(('1.', '2.', '3.', '4.', '5.', '1、', '2、', '3、')):
                        current_exp['description'] = line
                
                if len(current_exp) >= 2:
                    experience.append({
                        'title': current_exp.get('title', ''),
                        'company': current_exp.get('company', ''),
                        'dates': current_exp.get('dates', ''),
                        'description': current_exp.get('description', '')[:100]
                    })
                    current_exp = {}
            
            if current_exp and len(current_exp) >= 1:
                experience.append({
                    'title': current_exp.get('title', ''),
                    'company': current_exp.get('company', ''),
                    'dates': current_exp.get('dates', ''),
                    'description': current_exp.get('description', '')[:100]
                })
        
        return experience[:6]
    
    def _extract_education(self, text: str) -> List[Dict[str, str]]:
        education = []
        
        edu_section_match = re.search(r'教育背景[:：]?\s*(.*?)(?=工作经验|项目经验|专业技能|$)', text, re.DOTALL)
        if not edu_section_match:
            return education
        
        edu_text = edu_section_match.group(1)
        
        school_patterns = [
            r'([\u4e00-\u9fa5]{4,20}(?:大学|学院|学校|研究生|硕士|博士))',
        ]
        
        degree_keywords = ['本科', '硕士', '博士', '大专', '学士']
        
        lines = edu_text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            edu_item = {}
            
            degree_match = re.search(r'(本科|硕士|博士|大专|学士|研究生)', line)
            if degree_match:
                edu_item['degree'] = degree_match.group(1)
            
            school_match = re.search(r'([\u4e00-\u9fa5]{4,15}(?:大学|学院|学校))', line)
            if school_match:
                edu_item['school'] = school_match.group(1)
            
            major_match = re.search(r'([\u4e00-\u9fa5]{2,10}(?:专业|方向))', line)
            if major_match:
                edu_item['major'] = major_match.group(1)
            
            if edu_item:
                education.append(edu_item)
        
        return education[:3]
    
    def _extract_skills(self, text: str) -> List[str]:
        skills = []
        
        skill_section_match = re.search(r'专业技能[:：]?\s*(.*?)(?=工作经验|项目经验|教育背景|$)', text, re.DOTALL)
        if not skill_section_match:
            return skills
        
        skill_text = skill_section_match.group(1)
        
        tech_skills = [
            'JavaSE', 'JavaEE', 'Java', 'Spring', 'SpringBoot', 'SpringCloud', 'SpringMVC',
            'MyBatis', 'MyBatis-Plus', 'Hibernate', 'Struts',
            'Python', 'Django', 'Flask',
            'JavaScript', 'TypeScript', 'Vue', 'Vue3', 'React', 'Angular', 'Node.js', 'Node',
            'HTML', 'CSS', 'HTML5', 'CSS3', 'JQuery', 'Ajax', 'Echarts',
            'MySQL', 'Oracle', 'PostgreSQL', 'SQLServer', 'Redis', 'MongoDB', 'Elasticsearch',
            'Docker', 'Kubernetes', 'K8S', 'Jenkins', 'Git', 'Maven', 'SVN', 'Linux',
            'Tomcat', 'Nginx', 'Apache',
            'TCP/IP', 'HTTP', 'HTTPS', 'WebSocket',
            'Ajax', 'REST', 'API', 'SDK',
            'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
            'AI', 'Machine Learning', 'Deep Learning', 'NLP',
            'VUE', 'Element', 'Element-UI', 'TDesign', 'Layui',
            'SSM', 'SSH', 'Activiti', 'Flowable',
            'xxl-job', 'Knife4j', 'Pinecone',
        ]
        
        for skill in tech_skills:
            if skill in skill_text:
                skills.append(skill)
        
        skill_pattern = r'([A-Za-z+#]+[\w.#]*)'
        matches = re.findall(skill_pattern, skill_text)
        for match in matches:
            if len(match) >= 2 and match not in skills:
                skills.append(match)
        
        return list(set(skills))[:20]
        
        degree_patterns = [
            r'(Bachelor|Master|PhD|Doctorate|Associate|Diploma)[^\n]*',
            r'(B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?|Ph\.?D\.?)[^\n]*',
        ]
        
        for section in edu_section[:3]:
            degree_match = re.search('|'.join(degree_patterns), section, re.IGNORECASE)
            if degree_match:
                education.append({
                    'degree': degree_match.group(0).strip(),
                    'school': section.split(degree_match.group(0))[0].strip() if degree_match.group(0) in section else '',
                })
        
        return education
    
    def _extract_skills(self, text: str) -> List[str]:
        skills = []
        skill_keywords = ['skills', 'technical skills', 'competencies', 'technologies']
        
        lines = text.split('\n')
        in_skills = False
        skill_section = []
        
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in skill_keywords):
                in_skills = True
                continue
                
            if in_skills:
                if any(kw in line.lower() for kw in ['experience', 'education', 'languages']):
                    break
                if line.strip():
                    skill_section.append(line.strip())
        
        if skill_section:
            skill_text = ' '.join(skill_section)
            common_skills = [
                'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'ruby', 'go', 'rust',
                'react', 'vue', 'angular', 'next.js', 'node.js', 'django', 'flask', 'spring',
                'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
                'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
                'machine learning', 'deep learning', 'data science', 'ai', 'nlp',
                'html', 'css', 'tailwind', 'rest api', 'graphql',
                'linux', 'agile', 'scrum', 'jira',
            ]
            
            for skill in common_skills:
                if skill.lower() in skill_text.lower():
                    skills.append(skill)
        
        return list(set(skills))
    
    def _extract_languages(self, text: str) -> List[str]:
        languages = []
        lang_section = re.search(
            r'(languages?|language skills?)[\s:]+([^\n]+)',
            text,
            re.IGNORECASE
        )
        
        if lang_section:
            lang_text = lang_section.group(2)
            common_langs = ['english', 'chinese', 'spanish', 'french', 'german', 'japanese', 'korean']
            for lang in common_langs:
                if lang.lower() in lang_text.lower():
                    languages.append(lang.title())
        
        return languages
    
    def get_thumbnail(self, file_path: str, page_num: int = 0) -> Optional[bytes]:
        try:
            doc = fitz.open(file_path)
            page = doc[page_num]
            pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
            img_data = pix.tobytes("png")
            doc.close()
            return img_data
        except Exception:
            return None
    
    def clean_text(self, text: str) -> str:
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\x00-\x7F]+', '', text)
        text = text.strip()
        return text


def parse_resume(file_path: str) -> Dict[str, Any]:
    parser = ResumeParser()
    
    if file_path.lower().endswith('.pdf'):
        result = parser.parse_pdf(file_path)
    elif file_path.lower().endswith('.docx'):
        result = parser.parse_docx(file_path)
    else:
        return {'error': 'Unsupported file format'}
    
    if result.get('raw_text'):
        result['raw_text'] = parser.clean_text(result['raw_text'])
    
    return result


def get_resume_thumbnail(file_path: str) -> Optional[bytes]:
    parser = ResumeParser()
    return parser.get_thumbnail(file_path)


def parse_resume_with_ai(file_path: str, raw_text: str = None) -> Dict[str, Any]:
    print(f"tazlyx debug: Starting AI parsing for {file_path}")
    
    if not raw_text:
        parser = ResumeParser()
        if file_path.lower().endswith('.pdf'):
            result = parser.parse_pdf(file_path)
        elif file_path.lower().endswith('.docx'):
            result = parser.parse_docx(file_path)
        else:
            return {'error': 'Unsupported file format'}
        raw_text = result.get('raw_text', '')
    
    if not raw_text:
        print("tazlyx debug: No raw text extracted from file")
        return {'error': 'No text extracted from file'}
    
    print(f"tazlyx debug: Raw text length: {len(raw_text)} characters")
    
    try:
        from app.services.ai_service import parse_resume_with_ai_v2
        return parse_resume_with_ai_v2(raw_text)
    except Exception as e:
        print(f"tazlyx debug: Import AI service error: {str(e)}")
        import traceback
        print(f"tazlyx debug: Traceback: {traceback.format_exc()}")
        return {'error': str(e)}


def parse_resume_with_ai_stream(file_path: str, progress_callback=None) -> dict:
    """使用 AI 流式解析简历文本"""
    print(f"tazlyx debug: Starting AI streaming parsing for {file_path}")
    
    if progress_callback:
        progress_callback("正在提取文本...")
    
    parser = ResumeParser()
    if file_path.lower().endswith('.pdf'):
        result = parser.parse_pdf(file_path)
    elif file_path.lower().endswith('.docx'):
        result = parser.parse_docx(file_path)
    else:
        return {'error': 'Unsupported file format'}
    
    raw_text = result.get('raw_text', '')
    
    if not raw_text:
        print("tazlyx debug: No raw text extracted from file")
        return {'error': 'No text extracted from file'}
    
    text_length = len(raw_text)
    print(f"tazlyx debug: Raw text length: {text_length} characters")
    
    if progress_callback:
        progress_callback(f"文本提取完成 ({text_length} 字符)")
    
    try:
        provider = AIServiceFactory.get_current_provider()
        print(f"tazlyx debug: Using AI provider: {provider}")
        
        if progress_callback:
            progress_callback(f"正在调用 {provider} AI 分析...")
        
        service = AIServiceFactory.get_reasoner_service(provider)

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

        if progress_callback:
            progress_callback("AI 正在分析简历内容...")
        
        print(f"tazlyx debug: Calling AI Stream API...")
        
        def stream_callback(chunk):
            if chunk["type"] == "reasoning":
                if progress_callback:
                    progress_callback({"type": "thinking", "content": chunk["content"]})
        
        result = service.chat_stream(messages, callback=stream_callback)
        content = result.get("content", "")
        
        print(f"tazlyx debug: AI response: {content[:200]}...")

        if progress_callback:
            progress_callback("AI 分析完成，正在解析结果...")
        
        import re
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
