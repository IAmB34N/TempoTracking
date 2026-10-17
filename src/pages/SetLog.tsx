import { TopBar } from '../components/ui'

export default function SetLog({ gameId }: { gameId: string }) {
  return (
    <div className="page">
      <TopBar title="Set Log" />
      <div className="page-content">
        <div className="empty">Set log {gameId} — coming soon.</div>
      </div>
    </div>
  )
}
