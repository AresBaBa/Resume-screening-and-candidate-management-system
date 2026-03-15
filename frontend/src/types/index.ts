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

export interface Candidate {
  id: number;
  user_id: number;
  resume_url?: string;
  resume_parsed?: Record<string, unknown>;
  skills?: string[];
  experience_years?: number;
  education?: Education[];
  status: 'active' | 'inactive' | 'hired' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface Education {
  school: string;
  degree: string;
  field?: string;
  start_date?: string;
  end_date?: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  requirements?: string[];
  skills_required?: string[];
  location?: string;
  salary_range?: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'open' | 'closed' | 'draft';
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Application {
  id: number;
  candidate_id: number;
  job_id: number;
  resume_id?: number;
  status: 'pending' | 'reviewing' | 'interview' | 'rejected' | 'accepted';
  cover_letter?: string;
  ai_score?: number;
  ai_feedback?: string;
  interview_status: 'not_scheduled' | 'scheduled' | 'completed';
  interview_score?: number;
  notes?: string;
  applied_at?: string;
  updated_at?: string;
}

export interface Resume {
  id: number;
  candidate_id: number;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  parsed_data?: Record<string, unknown>;
  ai_summary?: string;
  ai_skills?: string[];
  ai_experience?: Experience[];
  ai_education?: Education[];
  parsing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at?: string;
  updated_at?: string;
}

export interface Experience {
  company: string;
  title: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}
