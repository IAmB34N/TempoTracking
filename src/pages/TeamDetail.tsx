import { TopBar } from '../components/ui'

export default function TeamDetail({ teamId }: { teamId: string }) {
  return (
    <div className="page">
      <TopBar title="Team" />
      <div className="page-content">
        <div className="empty">Team {teamId} — coming soon.</div>
      </div>
    </div>
  )
}
