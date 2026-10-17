import { TopBar } from '../components/ui'

export default function Stats({ gameId }: { gameId: string }) {
  return (
    <div className="page">
      <TopBar title="Stats" />
      <div className="page-content">
        <div className="empty">Stats {gameId} — coming soon.</div>
      </div>
    </div>
  )
}
