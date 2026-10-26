import { useCallback, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'
import Icon from '../ui/Icon.jsx'

const AUTOPLAY_MS = 3000
const SWIPE_MIN_PX = 40

/*
 * Image slideshow for the hero.
 *  - autoplay every 3s; pauses on hover, keyboard focus, hidden tab,
 *    and has a visible pause button (accessibility requirement)
 *  - no autoplay when the device asks for reduced motion
 *  - swipe left/right on touch screens, arrows + dots everywhere
 *  - only the first image loads immediately; the rest load lazily
 */
export default function HeroSlider({ slides = [] }) {
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [userPaused, setUserPaused] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const reduceMotion = usePrefersReducedMotion()
  const swipeStart = useRef(null)

  const goTo = useCallback((next) => setIndex(((next % count) + count) % count), [count])

  const autoplay = count > 1 && !reduceMotion && !userPaused && !hovering && !focused && !tabHidden

  useEffect(() => {
    if (!autoplay) return undefined
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [autoplay, count])

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (count === 0) return null

  function onPointerDown(event) {
    swipeStart.current = { x: event.clientX, y: event.clientY }
  }
  function onPointerUp(event) {
    if (!swipeStart.current) return
    const dx = event.clientX - swipeStart.current.x
    const dy = event.clientY - swipeStart.current.y
    swipeStart.current = null
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy)) goTo(index + (dx < 0 ? 1 : -1))
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-white shadow-card"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured images"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <div
        className="relative aspect-[4/3] touch-pan-y select-none sm:aspect-[16/10] lg:aspect-[4/3]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {slides.map((slide, i) => (
          <img
            key={slide.image}
            src={slide.image}
            srcSet={slide.imageSmall ? `${slide.imageSmall} 700w, ${slide.image} 1400w` : undefined}
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt={slide.alt || ''}
            aria-hidden={i !== index}
            draggable="false"
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'low'}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-700 ease-out ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink/35 to-transparent" />
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-card transition hover:bg-white"
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Next image"
            className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow-card transition hover:bg-white"
          >
            <Icon name="chevronRight" />
          </button>

          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1">
            {slides.map((slide, i) => (
              <button
                key={slide.image}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={i === index}
                className="grid size-8 place-items-center"
              >
                <span
                  className={`block h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white' : 'w-2 bg-white/60'}`}
                />
              </button>
            ))}
            {!reduceMotion ? (
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={userPaused ? 'Play slideshow' : 'Pause slideshow'}
                className="ml-1 grid size-8 place-items-center rounded-full text-white"
              >
                {userPaused ? (
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                    <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                  </svg>
                )}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
