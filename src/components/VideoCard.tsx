import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { VideoListItem } from '../api/types'
import { formatDuration, formatPublished, formatViews } from '../utils/format'
import { VerifiedIcon } from './icons'

interface VideoCardProps {
  video: VideoListItem
  layout?: 'grid' | 'list'
  showUploader?: boolean
  showDescription?: boolean
  index?: number
}

export function VideoCard({
  video,
  layout = 'grid',
  showUploader = true,
  showDescription = false,
  index = 0,
}: VideoCardProps) {
  const [loaded, setLoaded] = useState(false)

  const duration = formatDuration(video.duration)
  const meta = [
    formatViews(video.views, video.viewsText),
    formatPublished(video.publishedText, video.published),
  ]
    .filter(Boolean)
    .join(' \u00b7 ')

  const title = `${video.title} - ${video.uploaderName || 'unknown channel'}, ${meta}`

  if (layout === 'list') {
    return (
      <Link to={`/watch?v=${video.id}`} className="card card--list" aria-label={title} title={video.title}>
        <div className="card__thumb-wrap">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt=""
              className={`card__thumb${loaded ? '' : ' card__thumb--loading'}`}
              loading={index < 6 ? 'eager' : 'lazy'}
              onLoad={() => setLoaded(true)}
              referrerPolicy="no-referrer"
            />
          ) : null}
          {duration ? <span className="card__duration">{duration}</span> : null}
          {video.live ? <span className="card__live">Live</span> : null}
        </div>
        <div className="card__body">
          <div className="card__meta">
            <h3 className="card__title">{video.title}</h3>
            {showDescription && video.uploaderName ? (
              <p className="card__desc">{video.uploaderName}</p>
            ) : null}
            {showUploader && video.uploaderName ? (
              <span className="card__uploader">
                <span>{video.uploaderName}</span>
                {video.uploaderVerified ? (
                  <VerifiedIcon size={12} className="card__verified" />
                ) : null}
              </span>
            ) : null}
            <span className="card__sub">{meta}</span>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/watch?v=${video.id}`} className="card" aria-label={title} title={video.title}>
      <div className="card__thumb-wrap">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt=""
            className={`card__thumb${loaded ? '' : ' card__thumb--loading'}`}
            loading={index < 8 ? 'eager' : 'lazy'}
            onLoad={() => setLoaded(true)}
            referrerPolicy="no-referrer"
          />
        ) : null}
        {duration ? <span className="card__duration">{duration}</span> : null}
        {video.live ? <span className="card__live">Live</span> : null}
        {video.isShort ? <span className="card__short-badge">Short</span> : null}
      </div>
      <div className="card__body">
        {showUploader && video.uploaderAvatar ? (
          <img
            className="card__avatar"
            src={video.uploaderAvatar}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="card__meta">
          <h3 className="card__title">{video.title}</h3>
          {showUploader && video.uploaderName && video.uploaderId ? (
            <Link to={`/channel/${video.uploaderId}`} className="card__uploader">
              <span>{video.uploaderName}</span>
              {video.uploaderVerified ? <VerifiedIcon size={12} className="card__verified" /> : null}
            </Link>
          ) : showUploader && video.uploaderName ? (
            <span className="card__uploader">
              <span>{video.uploaderName}</span>
              {video.uploaderVerified ? <VerifiedIcon size={12} className="card__verified" /> : null}
            </span>
          ) : null}
          <span className="card__sub">{meta}</span>
        </div>
      </div>
    </Link>
  )
}