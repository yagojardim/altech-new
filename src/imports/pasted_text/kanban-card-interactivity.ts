Contexto: Altech Project (Inspection Mode). Corrigir a interatividade dos cards do Kanban e alinhá-los às regras de Work Items da Altech. Tema Dark Premium Altech (não copiar Jira). Persistir nos mocks (workItems.ts / setIssues). IMPORTANTE: implementar na ORDEM abaixo; a PRIORIDADE 1 é obrigatória e deve funcionar mesmo que o resto seja parcial.

═══ PRIORIDADE 1 (OBRIGATÓRIA) — CLICAR NO CARD ABRE O DETALHE ═══
Arquivo: src/pages/ProjectPage.tsx.
1. Na função BoardCard (~linha 330): adicionar prop onOpen: () => void; no <div> raiz (o que tem draggable) adicionar onClick={onOpen}; trocar cursor:'grab' por cursor:'pointer'.
2. Distinguir clique de arraste: registrar a posição no mousedown; só chamar onOpen se o ponteiro moveu < 5px até o mouseup (senão foi drag).
3. Onde o board renderiza <BoardCard ...> (~linhas 805 e 819): passar onOpen={() => setOpenIssue(issue)}.
4. No BoardTab: adicionar const [openIssue, setOpenIssue] = useState<Issue | null>(null).
5. Renderizar, quando openIssue !== null, o WorkItemDetailDrawer (src/components/ds/DashboardKit.tsx) ou TaskDrawer (src/components/TaskDrawer.tsx), recebendo openIssue e onClose={() => setOpenIssue(null)}.
6. Controles internos do card (avatar, menu ···) usam stopPropagation para não abrir o drawer.
VALIDAÇÃO 1: clicar em qualquer card abre o drawer daquele card; arrastar continua movendo; os dois não se confundem.

═══ PRIORIDADE 2 — MODELO DE CARD POR TIPO (WorkItemCard) ═══
7. Tratar o card como um WorkItemCard base com variações por type: story | bug | subtask (e task). Card compacto no board deve exibir: key, ícone do tipo, título, prioridade, status, responsável (avatar), story points (ou severidade em bug), indicador de bloqueio, indicadores de comentário/anexo quando houver, e até 3 tags condicionais críticas (se houver mais, mostrar "+N").
8. Estender o modelo de item (workItems.ts / Issue) com os campos necessários: type, severity (bug), description, story_points, estimate, assignee_id, reporter, due_date, labels, is_blocked, blocked_reason, parent_id, epic_id, feature_id, acceptance_criteria_count, comment_count, attachment_count, evidence_count.

═══ PRIORIDADE 3 — TAGS CONDICIONAIS (só quando a condição é verdadeira) ═══
9. Ordem de criticidade (ordenar as tags exibidas): Bloqueado > Bug Crítico > Atrasado > Sem Responsável > Dependência Aberta > Sem Critério de Aceite > Dúvida Funcional > Refinamento Pendente > Sem Estimativa > Descrição Insuficiente > Evidência Pendente > Prazo Próximo > Sem Atualização.
10. História (story): tags [Sem Épico] (sem epic_id), [Sem Feature], [Sem Critério de Aceite] (acceptance_criteria_count=0), [Refinamento Pendente], [Dependência Aberta], [Dúvida Funcional], [Ready] (só quando cumpre TODOS os critérios de Ready for Dev: título, descrição suficiente, épico/feature ou exceção, ≥1 critério de aceite, prioridade, estimativa, sem dependência crítica aberta, sem dúvida funcional crítica, status permitido). [Ready] é diferente de apenas "concluído".
11. Bug: exibir SEVERIDADE e PRIORIDADE como coisas distintas (badges separados). Tags [Bug Crítico] (severity=critical, destaque visual forte vermelho), [Bloqueante], [Sem Evidência] (evidence_count=0), [Reaberto], [Regressão], [Aguardando QA]/[Aguardando Reteste] conforme status.
12. Subtarefa: SEMPRE possuir parent_id (senão tag de erro [Sem Pai]); herda tenant_id/project_id do pai; tags [Pai Bloqueado], [Bloqueado], [Sem Responsável], [Atrasada]; nunca aparece solta no backlog.
13. Cores das tags: vermelha=bloqueio/bug crítico/falha; âmbar=atenção/pendência/risco; verde=saudável/ready/aprovado; azul=informação/associação.

═══ PRIORIDADE 4 — DRAWER (WorkItemDetailDrawer) + AÇÕES + ESTADOS ═══
14. O drawer expandido mostra todos os dados do item: key, tipo, título, descrição, status, prioridade, severidade (bug), responsável, reporter, story points/estimate, épico/feature, prazo, labels, critérios de aceite, subtarefas, comentários recentes, evidências, anexos e histórico de status.
15. Ações conforme permissão (persistir via setIssues): alterar status (move no board), trocar responsável, editar prioridade/pontos/título/descrição, comentar, marcar/resolver bloqueio, copiar link. Se o usuário puder ver mas não editar → drawer em modo LEITURA (ações ocultas/desabilitadas). Se não puder mover no board → drag/drop desabilitado.
16. Estados: normal, loading (skeleton, nunca infinito), vazio (coluna/filtro sem itens), erro ("Não foi possível carregar este item. Tente novamente."), sem permissão ("Você não possui permissão para visualizar este item.").
17. Consistência: mudança de status/responsável/bloqueio reflete em board, backlog, sprint e detalhe (mesma fonte de dados).

Regras gerais: tudo filtrado por tenant_id + project_id + escopo; card navegável por teclado; status não depende só de cor; visual segue tokens Altech (surface #16161D, borda #262633, verde #10B981, âmbar #F59E0B, vermelho #EF4444, azul #3B82F6/#6366F1).

CRITÉRIOS DE ACEITE:
- (P1) Clicar em card abre WorkItemDetailDrawer do item correto; drag continua funcionando.
- Story exibe [Ready] só quando cumpre todos os critérios; exibe faltas (Sem Critério/Sem Épico) quando aplicável.
- Bug exibe severidade e prioridade separadas; crítico com destaque; [Sem Evidência] quando faltar.
- Subtarefa sempre com parent_id; nunca solta.
- Tags só quando verdadeiras, ordenadas por criticidade, máximo 3 + "+N".
- Ações persistem e refletem entre telas; estados loading/vazio/erro/sem permissão existem; respeita permissões e tenant; visual Altech.