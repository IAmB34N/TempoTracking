import { TopBar } from '../components/ui'

export default function Track({ gameId }: { gameId: string }) {
  return (
    <div className="page">
      <TopBar title="Track" />
      <div className="page-content">
        <div className="empty">Track {gameId} — coming soon.</div>
      </div>
    </div>
  )
}
