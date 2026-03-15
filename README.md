# 智能简历分析平台

AI 赋能的智能简历分析平台，用于招聘流程中快速筛选和分析简历。

## 项目架构说明

### 整体架构

本项目采用前后端分离架构：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   Database      │
│   (Next.js)     │────▶│   (Flask)       │────▶│   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐             │
        │               │   Redis         │             │
        │               │   (状态缓存)    │             │
        │               └─────────────────┘             │
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐             │
        │               │   AI Service    │             │
        │               │   (OpenAI/      │             │
        │               │    DeepSeek)    │             │
        │               └─────────────────┘             │
        │                                               │
        ▼                                               │
┌─────────────────┐                                     │
│   WebSocket     │◀────────────────────────────────────┘
│   (实时通知)    │
└─────────────────┘
```

### 目录结构

```
Resume-screening-and-candidate-management-system/
├── frontend/                 # Next.js 前端应用
│   ├── src/
│   │   ├── app/            # Next.js App Router 页面
│   │   │   ├── jobs/       # 岗位管理页面
│   │   │   ├── resumes/    # 简历管理页面
│   │   │   ├── candidates/ # 候选人管理页面
│   │   │   ├── login/      # 登录页面
│   │   │   └── settings/   # 设置页面
│   │   ├── components/     # 通用组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── lib/            # API 封装
│   │   ├── stores/         # Zustand 状态管理
│   │   └── types/          # TypeScript 类型定义
│   └── package.json
│
├── backend/                  # Flask 后端应用
│   ├── app/
│   │   ├── models/         # SQLAlchemy 数据模型
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑服务
│   │   ├── middleware/     # 中间件
│   │   └── utils/          # 工具函数
│   ├── config.py           # 配置文件
│   └── requirements.txt    # Python 依赖
│
├── admin/                    # Vue3 管理后台 (可选)
├── deploy/                   # Docker 部署配置
└── docker/                   # Docker Compose 配置
```

## 技术选型及理由

### 前端技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| Next.js | 15.1.0 | App Router 新特性、Server Components、SEO 优化 |
| React | 18.3.1 | 组件化开发、丰富的生态系统 |
| TypeScript | 5.x | 类型安全、更好的开发体验 |
| Zustand | 4.5.0 | 轻量级状态管理、API 简洁 |
| SWR | 2.2.4 | 数据缓存与重新验证 |
| Tailwind CSS | 3.x | 原子化 CSS、快速开发 |
| Socket.io Client | 4.8.3 | WebSocket 实时通信 |
| ECharts | 6.x | 数据可视化 |

### 后端技术栈

| 技术 | 版本 | 选型理由 |
|------|------|----------|
| Flask | 3.0.0 | 轻量级 Web 框架、灵活扩展 |
| SQLAlchemy | 2.0.23 | ORM 抽象、数据库无关性 |
| PostgreSQL | - | 关系型数据存储、生产环境推荐 |
| Redis | 5.0.1 | 状态缓存、Session 存储 |
| Flask-SocketIO | 5.3.6 | WebSocket 支持 |
| OpenAI | 1.3.0 | AI 能力集成 |
| PDFPlumber | 0.10.3 | PDF 解析 |

### AI 集成

支持多种 AI 提供商：
- **OpenAI** (GPT-4o-mini)
- **DeepSeek** (deepseek-chat / deepseek-reasoner)
- **Anthropic** (Claude-3-Haiku)
- **xAI** (Grok-2)

## 本地开发环境搭建指南

### 前置要求

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- Redis 6+

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/Resume-screening-and-candidate-management-system.git
cd Resume-screening-and-candidate-management-system
```

### 2. 后端搭建

#### 2.1 创建虚拟环境

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

#### 2.2 安装依赖

```bash
pip install -r requirements.txt
```

#### 2.3 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库、AI API Key 等
```

#### 2.4 初始化数据库

```bash
# 确保 PostgreSQL 已启动
flask db init
flask db migrate -m "initial migration"
flask db upgrade
```

#### 2.5 启动后端服务

```bash
python run.py
# 服务运行在 http://localhost:5000
```

### 3. 前端搭建

#### 3.1 安装依赖

```bash
cd frontend
npm install
```

#### 3.2 配置环境变量

```bash
cp .env.local.example .env.local
# 编辑 .env.local 文件
```

#### 3.3 启动开发服务器

```bash
npm run dev
# 服务运行在 http://localhost:3000
```

### 4. Docker 方式启动 (推荐)

```bash
# 启动全部服务
cd docker
docker-compose up -d

# 访问
# 前端: http://localhost:3000
# 后端: http://localhost:5000
# Admin: http://localhost:5173
```

### 环境变量配置说明

#### 后端 (.env)

```env
# 数据库
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rscm
REDIS_URL=redis://localhost:6379/0

# JWT 密钥
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

# AI 配置 (至少配置一个)
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
# 或
OPENAI_API_KEY=your-openai-api-key

# CORS
CORS_ORIGINS=http://localhost:3000
```

#### 前端 (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:5000
```

## 部署方式说明

### Docker 部署 (推荐)

#### 生产环境构建

```bash
# 使用 Makefile
make docker-build    # 构建镜像
make docker-up       # 启动服务

# 或手动构建
cd docker
docker-compose -f docker-compose.yml up -d --build
```

#### 部署架构

```
                    ┌──────────────┐
                    │    Nginx     │
                    │  (端口 80)   │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │  Frontend  │ │  Backend   │ │   Admin    │
     │  (Next.js) │ │  (Flask)   │ │   (Vue)    │
     │  :3000     │ │  :5000     │ │  :5173     │
     └────────────┘ └──────┬─────┘ └────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      ┌──────────┐   ┌──────────┐   ┌──────────┐
      │PostgreSQL│   │  Redis   │   │   AI     │
      │  :5432   │   │  :6379   │   │  Service │
      └──────────┘   └──────────┘   └──────────┘
```

### 云平台部署

#### 前端部署 (Vercel)

```bash
cd frontend
vercel deploy
# 或连接 GitHub 仓库自动部署
```

#### 后端部署 (Railway/Render/阿里云)

1. 配置环境变量
2. 使用 Dockerfile 构建
3. 挂载持久化存储 (PostgreSQL/Redis)

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 关键技术决策与思考

### 1. 前后端分离架构

采用前后端完全分离的架构，前端使用 Next.js 的 App Router，后端使用 Flask REST API。这种架构使得前后端可以独立开发、部署和扩展。

### 2. 状态管理方案

- **前端**: 使用 Zustand 进行全局状态管理，轻量且易于使用
- **数据获取**: 使用 SWR 进行服务端状态管理和缓存
- **后端**: 使用 Redis 存储匹配状态，实现跨请求的状态持久化

### 3. AI 集成设计

实现了多 AI 提供商支持，通过统一的 Service 层封装不同 API 的调用逻辑。这种设计使得：
- 可以轻松切换不同的 AI 提供商
- 便于添加新的 AI 能力
- 统一错误处理和重试机制

### 4. 实时通信

使用 WebSocket 实现实时通知功能：
- 简历上传完成通知
- AI 分析完成通知
- 匹配状态更新通知

### 5. 文件处理

- PDF 解析使用 PDFPlumber 和 PyMuPDF
- 支持大文件分片上传
- 使用流式 SSE 返回 AI 分析进度

### 6. 数据库设计

使用 SQLAlchemy ORM，支持：
- 关系型数据模型
- 数据库迁移 (Flask-Migrate)
- 软删除支持

### 7. 安全性

- JWT Token 认证
- CORS 跨域配置
- 全局异常处理
- 请求日志记录

### 8. 性能优化

- Redis 缓存热点数据
- 前端骨架屏加载态
- WebSocket 减少轮询
- 数据库索引优化

## API 接口文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户 |
| PUT | /api/auth/me | 更新用户信息 |

### 简历接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/resumes | 获取简历列表 |
| GET | /api/resumes/my | 获取当前用户简历 |
| GET | /api/resumes/:id | 获取简历详情 |
| POST | /api/resumes | 上传简历 |
| DELETE | /api/resumes/:id | 删除简历 |
| POST | /api/resumes/:id/reparse | 重新解析简历 |

### 岗位接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/jobs | 获取岗位列表 |
| POST | /api/jobs | 创建岗位 |
| GET | /api/jobs/:id | 获取岗位详情 |
| PUT | /api/jobs/:id | 更新岗位 |
| DELETE | /api/jobs/:id | 删除岗位 |

### 候选人接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/jobs/:id/candidates | 获取岗位候选人列表 |
| POST | /api/jobs/:id/match | 开始匹配 |
| PUT | /api/candidates/:id/status | 更新候选人状态 |

### AI 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/parse-resume | 解析简历 |
| POST | /api/ai/match | 匹配岗位 |

## 功能特性

### 已完成

- [x] PDF 简历上传与解析
- [x] AI 智能信息提取 (姓名、联系方式、教育背景、工作经历、技能标签)
- [x] 岗位管理 (CRUD)
- [x] AI 岗位匹配与评分
- [x] 候选人管理面板
- [x] 候选人状态管理
- [x] WebSocket 实时通知
- [x] 响应式布局
- [x] 全局错误处理
- [x] Loading 状态管理
- [x] 候选人对比功能
- [x] 多个 JD 同时对比评分
- [x] 用户手动修正 AI 提取信息
- [x] 暗色/亮色主题切换

### 待完成

## 许可证

MIT License
