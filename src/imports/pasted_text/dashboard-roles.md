Contexto: continuação da Dashboard Home do Altech Project (Inspection Mode). Agora criar os 10 dashboards por papel, cada um com pergunta central, KPIs (cards) e blocos coerentes. IMPORTANTE: Project Manager, Product Manager e Product Owner são TRÊS perfis distintos — nunca fundir num "PM". Tech Lead não é dashboard de Dev individual. Substituir o mapeamento atual do RoleDashboard (que hoje funde PM/P.O e TechLead/Dev).
Cada dashboard: primeira dobra objetiva e escaneável, gestão por exceção, cards acionáveis (clicar navega/abre drawer), tags condicionais e StatusBadge.
1) ADMIN MASTER — "Minha empresa está corretamente administrada?"
   Cards: Usuários da Empresa, Projetos Criados, Boards Criados, Módulos Ativos, Usuários Bloqueados, Convites Pendentes.
   Blocos: Gestão de Usuários, Projetos & Boards, Módulos (não contratados = vitrine/upsell, SEM billing/checkout), Auditoria, Atividade Administrativa Recente.
   Ações: convidar/editar/bloquear/desbloquear/desativar usuário, resetar senha (gera senha temporária forte, exibida 1x, marca password_must_change + auditoria mock), atribuir dashboard, definir default, vincular projeto/squad, solicitar ativação de módulo. Nunca excluir usuário fisicamente (desativado = inactive; bloqueado = suspensão temporária).
2) PMO — "Quais projetos precisam de atenção?"
   Cards: Projetos Ativos, Projetos em Risco/Atrasados, Previsibilidade, Planejado x Concluído.
   Blocos: Saúde por RAG (verde/amarelo/vermelho, motivo OBRIGATÓRIO em amarelo/vermelho), Bloqueadores Críticos (responsável, impacto, dias bloqueado, próxima ação), Ritmo de Entrega, Capacidade do Time, Maturidade/Eficiência (melhoria contínua, nunca ranking individual). SEM foco financeiro/billing.
3) PROJECT MANAGER — "O que preciso destravar neste projeto?"
   Cards: Status do Projeto (combina %, tempo restante, bloqueios, risco de escopo, dependências), Progresso, Prazo/Marcos, Planejado x Concluído.
   Blocos: Sprint Atual, Board/Fluxo por Status, Bloqueadores & Riscos, Carga do Time, Próximas Ações. Priorizar itens que exigem ação do PM.
4) PRODUCT MANAGER — "O produto gera valor real?"
   Cards: Usuários Ativos MAU, Retenção & Stickiness, Churn Rate, Adoção de Features.
   Regras: Stickiness = DAU/MAU; Retenção por coorte (ex. D30); Churn por usuários/clientes/tenants (sem billing); Adoção sobre base ELEGÍVEL, não total.
   Blocos: Funil de Conversão/Ativação, Gargalos da Jornada, Roadmap Estratégico, Alocação de Valor (Crescimento/Evolução-UX/Sustentação). NÃO incluir sprint operacional, PRs, bugs técnicos ou capacidade de squad.
5) PRODUCT OWNER — "O backlog está claro, priorizado, refinado e pronto?"
   Cards: Cobertura Ready (pontos prontos ÷ velocidade média da squad, fallback por qtd), Saúde do Backlog (itens saudáveis ÷ avaliáveis), Progresso Funcional (considera validação/aceite, não só Done técnico), Bugs Funcionais Críticos.
   Item saudável = sem tags críticas + prioridade + vínculo hierárquico + descrição suficiente + critério de aceite (se história) + sem dependência crítica aberta.
   Tags condicionais: Sem Prioridade, Sem Épico, Sem Feature, Sem Critério de Aceite, Refinamento Pendente, Dependência Aberta, Dúvida Funcional, Sem Estimativa, Sem Responsável, Descrição Insuficiente, Status Incoerente, Evidência Pendente.
   Blocos: Backlog com Alertas (só itens com tags críticas), Ready para Próxima Sprint (itens ready sem alerta), Time Atuando no Projeto (avatares/iniciais, qtd de demandas, alertas, status atenção/crítico/saudável, marca itens sem responsável). Aceite do PO não substitui QA técnico.
6) SCRUM MASTER — "O time está fluindo e o que impede a sprint de avançar?"
   Cards: Saúde da Sprint, Impedimentos Ativos, Risco do Objetivo da Sprint, Fluxo/WIP.
   Blocos: Impedimentos por Responsável, Itens Parados há +X Dias, Aging WIP, Cerimônias & Ações de Facilitação, Dependências entre Times, Sinais de Sobrecarga.
   Tags: Impedimento Aberto, Sem Responsável, Parado há X Dias, WIP Excedido, Dependência Externa, Risco Sprint Goal, Aguardando Decisão/PO/QA/Cliente, Sem Atualização. Foco em fluxo e remoção de bloqueios — NUNCA ranking individual. Não é Project Manager nem Product Manager.
7) TECH LEAD — "O time consegue entregar tecnicamente com qualidade?"
   Cards: Saúde Técnica, Bugs Críticos/Bloqueantes, Pipeline/Deployments, Error Rate/Latency.
   Blocos: Gargalos de Código/PRs (separar: ação do time, aguardando terceiros, request changes, sem reviewer, conflito de merge, CI falhando), Cycle Time Técnico, Bloqueios Técnicos (responsável, impacto, próxima ação), Dívida Técnica/Saúde do Código.
   DORA: Deployment Frequency, Change Failure Rate, MTTR, Lead Time for Changes. NÃO é dashboard de Dev individual.
8) DEV — "O que preciso resolver primeiro hoje?"
   Escopo padrão: assignee_id = current_user_id (+ reviewer_id, author_user_id, action_required_by, mentioned_user_id quando aplicável).
   Cards: Meus Itens Ativos, Itens Atrasados/Próximos do Prazo, Meus Itens Bloqueados, Meus PRs/Code Review.
   Blocos: Minha Fila Ativa (My Kanban), Ações Necessárias em PR, Aguardando Terceiros, Atividade Recente.
   Ordenar por: ação necessária do dev → QA devolveu → request changes → bloqueios dependentes do dev → bugs críticos → atrasados → prazo próximo → em desenvolvimento → a fazer → aguardando terceiros.
9) UX/UI — "A experiência está clara, validada, consistente e pronta para virar entrega?"
   Cards: Fluxos em Design, Protótipos Prontos para Validação, Pendências UX Críticas, Handoff Pronto para Dev.
   Blocos: Fila de Design Ativa, Design QA/Validação de Interface, Validação com Usuários/Feedbacks, Design System/Consistência Visual.
   Tags: Sem Fluxo, Sem Protótipo, Sem Validação, UX Crítico, Acessibilidade Pendente, Sem Responsivo, Sem Estados, Fora do Design System, Handoff Incompleto, Dev Devolveu, PO Devolveu, Texto Pendente.
10) QA — "O que preciso testar agora para garantir a entrega?"
   Cards: Itens Aguardando Teste (Ready for QA, Aguardando QA/Teste, Em Homologação, Pronto/Aguardando Validação), Bugs Críticos/Bloqueantes, Taxa de Rejeição/Retrabalho, Evidências Pendentes.
   Blocos: Fila de Execução de Testes, Fila de Reteste de Bugs, Cobertura de Testes/Critérios Validados, Ambientes/Massa de Teste.
   Ações QA: aprovar correção, reprovar, reabrir, solicitar evidência do dev, adicionar evidência QA, comentar resultado.
Manter mesma pergunta central visível no topo de cada dashboard. Cliente/Solicitante nunca acessa dashboards internos (Dev, Tech Lead, QA, PMO, Admin) salvo dashboard específico atribuído.