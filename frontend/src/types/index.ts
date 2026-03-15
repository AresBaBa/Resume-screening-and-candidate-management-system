export interface User {
  id: number;
  email: string;
  name: string;
  role: 'candidate' | 'admin';
  avatar_url?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  access_token: string;
  refresh_token?: string;
}

export interface Resume {
  id: number;
  user_id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  parsing_status: 'pending' | 'processing' | 'completed' | 'failed';
  parsed_data?: string;
  ai_summary?: string;
  ai_skills?: string[];
  ai_experience?: Experience[];
  ai_education?: Education[];
  ai_projects?: Project[];
  ai_contact?: Contact;
  ai_structured?: Record<string, unknown>;
  ai_score?: number;
  ai_feedback?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  gender?: string;
  birthday?: string;
}

export interface Experience {
  title?: string;
  company?: string;
  dates?: string;
  description?: string;
}

export interface Education {
  degree?: string;
  school?: string;
  major?: string;
  graduation_date?: string;
}

export interface Project {
  name?: string;
  role?: string;
  tech?: string;
  description?: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  requirements?: string[];
  skills_required?: string[];
  skills_preferred?: string[];
  location?: string;
  salary_range?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'open' | 'closed';
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface JobApplication {
  id: number;
  job_id: number;
  resume_id: number;
  applicant_name?: string;
  applicant_email?: string;
  applicant_phone?: string;
  applicant_city?: string;
  status: 'pending' | 'screening' | 'pass' | 'interviewing' | 'hired' | 'rejected';
  matching_score?: number;
  skill_score?: number;
  experience_score?: number;
  education_score?: number;
  ai_comment?: string;
  matching_data?: MatchingData;
  created_at?: string;
  updated_at?: string;
  resume?: Resume;
  job?: Job;
}

export interface MatchingData {
  matched_skills?: string[];
  missing_skills?: string[];
  preferred_skills?: string[];
  experience_match?: string;
  education_match?: string;
}

export interface PaginatedResponse<T> {
  items?: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface JobMatchResult {
  message: string;
  matched_count: number;
  results: JobApplication[];
}

export interface CandidateComparison {
  candidates: JobApplication[];
  comparison: {
    metrics: string[];
    labels: string[];
  };
}
