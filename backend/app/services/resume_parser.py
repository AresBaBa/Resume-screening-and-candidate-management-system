import re
import pdfplumber
import fitz
from io import BytesIO
from PIL import Image
from typing import Dict, List, Optional, Any


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
            'languages': self._extract_languages(text),
        }
        return structured
    
    def _extract_name(self, text: str) -> Optional[str]:
        lines = text.strip().split('\n')
        if lines:
            first_line = lines[0].strip()
            if 2 <= len(first_line.split()) <= 4:
                if re.match(r'^[A-Z][a-z]+(?:\s[A-Z][a-z]+)+$', first_line):
                    return first_line
        return None
    
    def _extract_email(self, text: str) -> Optional[str]:
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        match = re.search(email_pattern, text)
        return match.group(0) if match else None
    
    def _extract_phone(self, text: str) -> Optional[str]:
        phone_patterns = [
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',
            r'\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b',
            r'\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b',
        ]
        for pattern in phone_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0)
        return None
    
    def _extract_summary(self, text: str) -> Optional[str]:
        summary_keywords = ['summary', 'objective', 'profile', 'about', 'professional summary']
        
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in summary_keywords):
                summary_lines = []
                for j in range(i + 1, min(i + 5, len(lines))):
                    if lines[j].strip():
                        summary_lines.append(lines[j].strip())
                    else:
                        break
                if summary_lines:
                    return ' '.join(summary_lines)
        return None
    
    def _extract_experience(self, text: str) -> List[Dict[str, str]]:
        experience = []
        exp_keywords = ['experience', 'work history', 'employment', 'professional experience']
        
        lines = text.split('\n')
        in_experience = False
        exp_section = []
        
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in exp_keywords):
                in_experience = True
                continue
                
            if in_experience:
                if any(kw in line.lower() for kw in ['education', 'skills', 'languages', 'projects']):
                    break
                if line.strip():
                    exp_section.append(line.strip())
        
        for i, section in enumerate(exp_section[:5]):
            date_pattern = r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\s*[-–—to]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?[a-z]*\s*\d{0,4}|(\d{4}\s*[-–—to]+\s*\d{0,4})'
            dates = re.findall(date_pattern, section, re.IGNORECASE)
            
            experience.append({
                'title': section.split(',')[0] if ',' in section else section[:50],
                'company': section.split(',')[1].strip() if ',' in section else '',
                'dates': ' '.join([' '.join(d) for d in dates]) if dates else '',
            })
        
        return experience
    
    def _extract_education(self, text: str) -> List[Dict[str, str]]:
        education = []
        edu_keywords = ['education', 'academic', 'qualification']
        
        lines = text.split('\n')
        in_education = False
        edu_section = []
        
        for i, line in enumerate(lines):
            if any(keyword in line.lower() for keyword in edu_keywords):
                in_education = True
                continue
                
            if in_education:
                if any(kw in line.lower() for kw in ['experience', 'skills', 'languages', 'projects']):
                    break
                if line.strip():
                    edu_section.append(line.strip())
        
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
