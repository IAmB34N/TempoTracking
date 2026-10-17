import { Button, TopBar } from '../components/ui'
import { navigate } from '../lib/router'

export default function NotFound() {
  return (
    <div className="page">
      <TopBar title="Not found" back="/" />
      <div className="page-content">
        <div className="empty">That page doesn't exist.</div>
        <Button onClick={() => navigate('/')}>Go home</Button>
      </div>
    </div>
  )
}
