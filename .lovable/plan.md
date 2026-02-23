

## Aplicação de Gestão de Reservas de Salas do Clube

### Resumo
Aplicação completa para gerir reservas de 6 salas do clube, com 3 tipos de utilizador, calendário mensal/semanal, controlo de cauções e gestão dinâmica dos nomes das salas.

---

### Arquitetura Técnica

**Backend (Lovable Cloud / Supabase):**

- **Tabela `rooms`**: id, name, description, color, is_active, created_at
- **Tabela `reservations`**: id, room_id (FK), user_id (FK), date, start_time, end_time, responsible_name, event_type, num_people, contact, deposit_amount, deposit_status (enum: pending/paid/returned), status (enum: pending/confirmed/cancelled), created_at, updated_at
- **Tabela `user_roles`**: id, user_id (FK to auth.users), role (enum: admin/member/direction)
- **RLS policies** para cada tabela conforme o papel do utilizador
- **Trigger** para atribuir papel "member" por defeito a novos registos

**Frontend (React + TypeScript + Tailwind + shadcn/ui):**

#### Páginas e Componentes

1. **Autenticacao** (`/login`, `/register`)
   - Formularios de login e registo com Supabase Auth
   - Redirecionamento baseado no papel do utilizador

2. **Layout Principal** com navegacao lateral
   - Menu adapta-se ao papel do utilizador (admin ve tudo, direction so ve calendario)

3. **Calendario** (`/calendar`) -- todos os utilizadores
   - Componente de calendario customizado com vista mensal e semanal
   - Blocos coloridos por sala com indicador de estado
   - Filtro por sala
   - Clique numa reserva abre painel de detalhes
   - Legenda das salas com nomes dinamicos

4. **Nova Reserva** (`/bookings/new`) -- so membros
   - Formulario com selecao de sala (nomes configurados pelo admin)
   - Validacao de sobreposicao em tempo real
   - Campos: sala, data, hora inicio/fim, responsavel, tipo evento, num pessoas, contacto, caucao (valor + estado)
   - Reserva criada em estado "Pendente"

5. **As Minhas Reservas** (`/my-bookings`) -- so membros
   - Lista das reservas do membro com estado
   - Cancelar reservas pendentes

6. **Painel de Gestao** (`/admin`) -- so admin
   - Lista de todas as reservas com filtros (estado, sala, data)
   - Acoes: confirmar, cancelar, editar reservas
   - Seccao de caucoes em aberto
   - Gestao de utilizadores (ver membros, alterar papeis)

7. **Gestao de Salas** (`/admin/rooms`) -- so admin
   - Lista de salas com nome, descricao e cor
   - Adicionar, editar, desativar salas
   - Salas desativadas mantidas no historico mas ocultas no formulario

---

### Regras de Negocio

- Nao e possivel reservar a mesma sala em horarios sobrepostos
- Membros criam reservas em estado pendente; so o admin confirma
- A Direcao tem acesso apenas de leitura
- O estado da caucao so pode ser alterado pelo admin
- Salas desativadas nao aparecem no formulario de nova reserva mas mantem historico
- Nomes das salas sao totalmente geríveis pelo admin

---

### Sequencia de Implementacao

1. Configurar Lovable Cloud (Supabase) -- tabelas, enums, RLS, auth
2. Paginas de autenticacao (login/registo)
3. Layout principal com navegacao lateral responsiva
4. Gestao de salas (admin)
5. Calendario com vistas mensal e semanal
6. Formulario de nova reserva com validacao
7. Painel de gestao do admin (reservas, caucoes, utilizadores)
8. Pagina "As Minhas Reservas" para membros
9. Vista de leitura para Direcao
10. Testes e ajustes de responsividade

