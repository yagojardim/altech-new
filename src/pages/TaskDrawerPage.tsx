import { useState } from 'react'
import { TaskModal } from '../components/TaskModal'
import ProjectPage from './ProjectPage'

export default function TaskDrawerPage() {
  const [modalOpen, setModalOpen] = useState(true)

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Background: blurred project view */}
      <div className={`flex-1 overflow-hidden transition-all duration-200 ${modalOpen ? 'pointer-events-none select-none' : ''}`}>
        <ProjectPage />
      </div>

      {/* Re-open button */}
      {!modalOpen && (
        <div className="absolute right-4 top-4 z-30">
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 text-white text-sm font-medium rounded-xl shadow-lg hover:brightness-105 transition-all"
            style={{ background: '#2F6BFF' }}
          >
            Abrir PM-142 →
          </button>
        </div>
      )}

      {/* Modal */}
      {modalOpen && <TaskModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
