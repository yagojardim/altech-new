import { useState } from 'react'
import { WorkItemDetail, type WorkItemData, type WIAcItem, type WILinkedIssue, type WIChild } from '../components/WorkItemDetail'

// IssueDetailPage — unified work item detail in page mode
// Uses WorkItemDetail component shared with the card drawer.

const INITIAL_DATA: WorkItemData = {
  key:              'PM-102',
  type:             'bug',
  title:            'Login form validation falha em dispositivos iOS',
  status:           'in-progress',
  priority:         'critical',
  labels:           ['Eng', 'Mobile'],
  assigneeInitials: 'JN',
  assigneeName:     'João Nunes',
  reporterInitials: 'AL',
  reporterName:     'Ana Lima',
  epicKey:          'EP-02',
  epicLabel:        'Infra & Eng',
  epicColor:        '#F59E0B',
  sprintName:       'Sprint 14',
  blocked:          false,
  severity:         'critical',
  description:      'Ao tentar submeter o formulário de login em dispositivos iOS, a validação de campos não é disparada corretamente, permitindo tentativas com campos vazios.\n\nO evento onBlur do React não é acionado quando o teclado virtual fecha no Safari iOS, o que impede a validação em tempo real de funcionar como esperado.',
  dueDate:          'Abr 3',
  points:           3,
  fixVersions:      ['v2.4.1'],
  availableEpics: [
    { id:'EP-01', label:'Website Relaunch',    color:'#3B82F6' },
    { id:'EP-02', label:'Infra & Eng',         color:'#F59E0B' },
    { id:'EP-03', label:'Pesquisa & Conteúdo', color:'#A78BFA' },
  ],
  availableMembers: [
    { id:'JN', initials:'JN', name:'Julia Neves'     },
    { id:'AL', initials:'AL', name:'Ana Lima'        },
    { id:'NM', initials:'NM', name:'Natalia Moura'   },
    { id:'CS', initials:'CS', name:'Carlos Silva'    },
    { id:'RM', initials:'RM', name:'Rafael Mendes'   },
    { id:'LF', initials:'LF', name:'Lucas Ferreira'  },
  ],
  availableSprints: [
    { id:'s13', name:'Sprint 13' },
    { id:'s14', name:'Sprint 14' },
    { id:'s15', name:'Sprint 15' },
  ],
  availableLabels:   ['Design','Web','Research','Content','Mobile','Eng','UX','SEO','Brand'],
  availableVersions: ['v2.4.0','v2.4.1','v2.5.0'],
  sprintId:         's14',
  history:          [],
  createdAt:        '10 abr 2025',
  updatedAt:        '15 abr 2025',
  acItems: [
    { id:'a1', text:'Validação disparada ao submeter com campo vazio',              done:false },
    { id:'a2', text:'Mensagem de erro exibida corretamente',                        done:true  },
    { id:'a3', text:'Comportamento consistente em iOS 16+ e Android 13+',           done:false },
    { id:'a4', text:'Testes unitários adicionados para o componente',               done:false },
  ] as WIAcItem[],
  children: [
    { key:'PM-102a', title:'Investigar comportamento do onBlur no Safari',   type:'subtask', status:'done',        assigneeInitials:'JN' },
    { key:'PM-102b', title:'Criar test case automatizado',                   type:'subtask', status:'in-progress', assigneeInitials:'JN' },
    { key:'PM-102c', title:'Validar fix no TestFlight',                      type:'subtask', status:'todo',        assigneeInitials:'AL' },
  ] as WIChild[],
  linkedIssues: [
    { relType:'Bloqueia',      key:'PM-107', title:'Spec de nav + componente footer', status:'in-review', priority:'low',    assigneeInitials:'AL' },
    { relType:'Relacionada a', key:'PM-108', title:'UX study: design Northwind',      status:'in-review', priority:'medium', assigneeInitials:'JN' },
  ] as WILinkedIssue[],
  comments: [
    { author:'JN', authorName:'João Nunes', body:'Investiguei e o problema está no handler onBlur do React no Safari. Quando o teclado fecha, o blur não é disparado corretamente.', time:'há 2h' },
    { author:'AL', authorName:'Ana Lima',   body:'Consegui reproduzir também no Chrome iOS. Parece ser um problema mais amplo do que apenas o Safari.', time:'há 1h' },
  ],
}

export default function IssueDetailPage() {
  const [data, setData] = useState<WorkItemData>(INITIAL_DATA)

  return (
    <WorkItemDetail
      mode="page"
      data={data}
      onUpdate={setData}
    />
  )
}
