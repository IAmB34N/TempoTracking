import { TopBar } from '../components/ui'

export default function NewGame() {
  return (
    <div className="page">
      <TopBar title="New Game" />
      <div className="page-content">
        <div className="empty">New Game — coming soon.</div>
      </div>
    </div>
  )
}
