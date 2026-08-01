Contexto: finalizar a Dashboard Home do Altech Project (Inspection Mode) — padronizar visual/componentes/estados E tornar os cards realmente interativos, reaproveitando os 4 padrões de card da tela Dashboard executivo dentro da Home de cada papel. Identidade visual PRÓPRIA (não copiar Jira).

1) DESIGN SYSTEM ALTECH — realinhar tokens (src/index.css / tokens):
   background #09090B e #0D0D11; cards #16161D; bordas #262633; verde #10B981 (sucesso/concluído/ready); âmbar #F59E0B (atenção/pendência); vermelho #EF4444 (erro/bloqueio/crítico); azul Altech #3B82F6 e #6366F1 (destaque/ativo). Tipografia Inter ou Plus Jakarta Sans. Alta densidade, visual limpo, moderno, proprietário.

2) BIBLIOTECA DE COMPONENTES REUTILIZÁVEIS — criar/consolidar e usar em TODOS os dashboards e telas internas (fonte única, sem duplicar): KpiCard, MetricCard, AlertCard, RagCard, ProgressCard, DataGrid, UserAvatarStack, WorkQueue, ConditionalTag, StatusBadge, EmptyState, LoadingState, PermissionDeniedState, AuditFeed, ActivityTimeline, WorkItemCard, WorkItemDetailDrawer, FilterBar, DashboardSwitcher.

3) ESTADOS OBRIGATÓRIOS em cada bloco/lista:
   - EmptyState: explica o que está vazio e sugere a próxima ação.
   - LoadingState: skeleton curto (mock resolve rápido, nunca travar).
   - Erro: mensagem clara + retry.
   - PermissionDeniedState: explica falta de permissão/escopo SEM quebrar a tela.

4) INTERATIVIDADE — CONTRATO ÚNICO PARA TODOS OS CARDS DA HOME (hoje "Ver projeto", "Ver todos" e as linhas não têm ação; corrigir):
   a. Card de KPI/resumo (número agregado): clicar NAVEGA para a lista/board correspondente JÁ FILTRADA por aquele recorte (ex.: "Meus bloqueados" → lista de itens bloqueados do escopo).
   b. Linha de demanda/item individual (ex.: PM-142, uma entrega, um bug): clicar ABRE o WorkItemDetailDrawer com EXATAMENTE aquele item — key, título, status, responsável, descrição, prioridade, sprint, tags e histórico. O drawer recebe o id real do item clicado (nunca genérico).
   c. Card que representa entidade única (um projeto no RagCard): clicar no card ou em "Ver projeto →" navega para o projeto.
   d. "Ver todos"/rodapés navegam para a tela completa do bloco.
   e. Todo elemento clicável: cursor pointer, hover visível, foco por teclado, área de clique clara. Nenhum clique morto — se ainda não houver destino, abrir drawer/toast coerente.
   f. Respeitar escopo/permissão (getUserAccessibleScope): só navega para itens dentro de projects_allowed/squads_allowed/permissions; item fora do escopo não aparece.

5) PORTAR OS 4 PADRÕES DA TELA DASHBOARD PARA A HOME (como componentes compartilhados, ligados à função de cada papel):
   - RagCard (RAG HealthCard): squad + projeto + StatusBadge (Saudável/Em risco/Bloqueado) + chip de motivo OBRIGATÓRIO em risco/bloqueio + barra de progresso + dias restantes/atraso + "Ver projeto →"; card clicável → projeto. Usar em: PMO (Saúde por RAG), Project Manager (Status do Projeto), Admin Master (Projetos & Boards).
   - ProgressCard (Progresso + Sparkline + Velocidade): % grande + barra com marcos de sprint + curva de entrega (últimas 8 sprints) + velocidade média (pts/sprint); clicar → sprint/relatório. Usar em: Member (Meu progresso), PMO (Ritmo/Previsibilidade), Project Manager (Planejado × Concluído).
   - WorkQueue de Impedimentos (AlertCard): cada linha = chip status (Bloqueado/Em risco) + key + título + avatar do responsável + chip "Xd bloqueado"; header com contador + "Ver todos"; ordenar por dias desc; cada linha clicável → WorkItemDetailDrawer daquele item. Usar em: Scrum Master (Impedimentos), PMO (Bloqueadores Críticos), Project Manager (Bloqueadores & Riscos), Dev (Meus Bloqueados).
   - Sprint Donut + WorkQueue de Entregas: donut de % concluído + lista (avatar + título + data + StatusBadge Em andamento/Em revisão/Concluído/Bloqueado/Backlog); cada entrega clicável → WorkItemDetailDrawer; donut clicável → sprint. Usar em: Project Manager/Member (Sprint Atual), Dev (Minha Fila), QA (Aguardando Teste).

6) FEEDBACK DE AÇÃO: nenhum botão principal sem feedback. Ação mockada → toast, modal, drawer ou atualização local coerente.

7) FILTROS: FilterBar por tenant_id, project_id, squad_id, permissões e escopo; cards refletem o filtro.

CRITÉRIOS DE ACEITE: Home renderiza para os 10 perfis (incl. Scrum Master, Product Manager e Product Owner distintos); cada perfil com pergunta central + KPIs + filtros + blocos coerentes; DashboardSwitcher só para múltiplos dashboards; default abre correto; mocks consistentes; nenhuma tela vazia ou presa em loading; nenhuma rota exige auth real; nada copia o visual do Jira; componentes seguem o Design System Altech; todo card de KPI navega para a lista filtrada e toda linha de demanda abre o work item correto no drawer (nenhum clique morto); RagCard/ProgressCard/WorkQueue/Donut aparecem na Home dos papéis indicados; permissões/escopo simulados corretamente; os itens "Minhas tarefas", "Caixa de entrada" e "Hoje" não existem mais na navegação.