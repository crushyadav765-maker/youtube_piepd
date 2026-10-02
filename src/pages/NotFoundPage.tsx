import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="container">
      <EmptyState
        title="Page not found"
        message="That route does not exist. Head back to the home page to keep watching."
      />
      <div className="load-more">
        <Link to="/" className="button button--primary">
          Back home
        </Link>
      </div>
    </div>
  )
}