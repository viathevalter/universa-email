# UniversaEmail - SaaS de Email Marketing, Inteligência de Leads com IA & Resend

Plataforma SaaS moderna, rápida e multi-tenant para **prospecção ativa de tomadores de decisão B2B com IA (Google Gemini)**, **validação em tempo real de MX via DNS over HTTPS (Google & Cloudflare)** e **motor de disparos resiliente integrado ao Resend**.

---

## 🌟 Funcionalidades Core

1. **AI Lead Machine**: Descoberta ativa de empresas e decisores com enriquecimento e validação DNS/MX em tempo real.
2. **CRM Central de Leads**: Visualização dinâmica em Tabela e Quadro Kanban, filtros por porte (Tier 1, 2, 3), importação e exportação de CSV, governança de opt-out e audiências salvas.
3. **Editor de Templates**: Tags dinâmicas (`{{nome}}`, `{{empresa}}`, `{{cargo}}`, `{{cidade}}`, `{{link_descadastro}}`) com Live Preview responsivo para Desktop e Mobile.
4. **Motor de Disparos Resend**: Fila resiliente com controle de taxa de envios (Rate Limiting) e tracking de entregas/aberturas/cliques.
5. **Modo Claro & Escuro (Light & Dark)**: Seletor de temas com transições suaves e design refinado.
6. **Integração Supabase & Resend**: PostgreSQL com RLS para isolamento multi-tenant e autenticação SPF/DKIM/DMARC.

---

## 🚀 Como Executar Localmente

1. Clone o repositório e instale as dependências:
```bash
npm install
```

2. Crie o arquivo `.env` baseado em `.env.example`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_anon
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
VITE_GEMINI_API_KEY=sua_chave_gemini
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

---

## 📦 Deploy na Vercel

O projeto conta com arquivo `vercel.json` configurado para SPA. Basta conectar seu repositório no painel da Vercel e adicionar as variáveis de ambiente.
