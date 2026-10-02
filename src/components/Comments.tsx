import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { useSettings } from '../state/settingsContext'
import type { CommentItem } from '../api/types'
import { formatCount } from '../utils/format'
import { ChevronDownIcon, ChevronRightIcon, LikeIcon, VerifiedIcon } from './icons'
import { EmptyState, ErrorState, Skeleton } from './ui'

export function Comments({ videoId }: { videoId: string }) {
  const { call, settings } = useSettings()
  const [showAll, setShowAll] = useState(false)

  const { data, error, loading, reload } = useAsync(
    () => call((api) => api.comments(videoId, null)),
    [call, videoId],
  )

  if (loading) {
    return (
      <div style={{ marginTop: 32 }}>
        <Skeleton className="skeleton--line" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="comment">
              <Skeleton className="skeleton--avatar" />
              <div className="comment__body">
                <Skeleton className="skeleton--line-short" />
                <Skeleton className="skeleton--line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ marginTop: 32 }}>
        <ErrorState title="Comments unavailable" message={error.message} onRetry={reload} />
      </div>
    )
  }

  if (data?.disabled || !data || data.comments.length === 0) {
    return (
      <div style={{ marginTop: 32 }}>
        <EmptyState
          title="No comments"
          message={
            settings.provider === 'piped'
              ? 'Comments are disabled or blocked on the current Piped instance.'
              : 'Comments are disabled for this video, or the instance is blocking the request.'
          }
        />
      </div>
    )
  }

  const visible = showAll ? data.comments : data.comments.slice(0, 8)

  return (
    <section style={{ marginTop: 32 }}>
      <div className="comments__header">
        <span className="comments__count">{formatCount(data.comments.length)} comments</span>
      </div>
      {visible.map((comment) => (
        <Comment key={comment.id} comment={comment} />
      ))}
      {data.comments.length > 8 ? (
        <button type="button" className="button" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer comments' : `Show all ${data.comments.length} comments`}
        </button>
      ) : null}
    </section>
  )
}

function Comment({ comment }: { comment: CommentItem }) {
  const [showReplies, setShowReplies] = useState(false)

  return (
    <article className="comment">
      {comment.avatar ? (
        <img className="comment__avatar" src={comment.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div className="comment__avatar" />
      )}
      <div className="comment__body">
        <div className="comment__head">
          {comment.authorId ? (
            <Link to={`/channel/${comment.authorId}`} className="comment__author">
              {comment.author}
            </Link>
          ) : (
            <span className="comment__author">{comment.author}</span>
          )}
          <VerifiedIcon size={12} />
          <span className="comment__time">{comment.publishedText}</span>
          {comment.pinned ? <span className="comment__badge">Pinned</span> : null}
          {comment.creatorReplied ? <span className="comment__badge">Creator</span> : null}
        </div>
        <p className="comment__text">{comment.text}</p>
        <div className="comment__actions">
          <span className="comment__likes">
            <LikeIcon size={14} />
            {comment.likes > 0 ? formatCount(comment.likes) : ''}
          </span>
          <button type="button" className="comment__reply">
            Reply
          </button>
        </div>

        {comment.replies.length > 0 ? (
          <>
            <button
              type="button"
              className="comment__reply-toggle"
              onClick={() => setShowReplies((v) => !v)}
            >
              {showReplies ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
            {showReplies ? (
              <div className="comment__replies">
                {comment.replies.map((reply) => (
                  <Comment key={reply.id} comment={reply} />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </article>
  )
}