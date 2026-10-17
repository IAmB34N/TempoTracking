import { TopBar } from '../components/ui'

export default function PlayDetail({ gameId, playId }: { gameId: string; playId: string }) {
  return (
    <div className="page">
      <TopBar title="Set" />
      <div className="page-content">
        <div className="empty">
          Set {playId} of {gameId} — coming soon.
        </div>
      </div>
    </div>
  )
}
