import { useCallback, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'
import Icon from './Icon.jsx'

/*
 * One-row slider that moves one card at a time every `interval` ms and
 * starts again from the beginning at the end.
 *  - customers can also swipe it (phone) or use the arrow buttons, which
 *    appear on mouse hover / keyboard focus so they never cover the cards
 *  - pauses while the mouse is over it, while it has keyboard focus,
 *    for a few seconds after the customer touches it, and when the tab
 *    is hidden; no automatic movement when "reduce motion" is on
 *  - itemClassName decides how many cards are visible per screen size
 */
export default function AutoCarousel({ items, renderItem, getKey, itemClassName, interval = 3000, label }) {
  const trackRef = useRef(null)
  const resumeTimer = useRef(null)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touched, setTouched] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)
  const reduceMotion = usePrefersReducedMotion()

  const step = useCallback((direction) => {
    const track = trackRef.current
    if (!track) return
    const card = track.firstElementChild
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    const distance = (card?.getBoundingClientRect().width || track.clientWidth) + gap
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    const atStart = track.scrollLeft <= 4

    if (direction > 0 && atEnd) track.scrollTo({ left: 0, behavior: 'smooth' })
    else if (direction < 0 && atStart) track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' })
    else track.scrollBy({ left: direction * distance, behavior: 'smooth' })
  }, [])

  const autoplay = !reduceMotion && !hovering && !focused && !touched && !tabHidden && items.length > 1

  useEffect(() => {
    if (!autoplay) return undefined
    const timer = setInterval(() => step(1), interval)
    return () => clearInterval(timer)
  }, [autoplay, interval, step])

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(resumeTimer.current)
    }
  }, [])

  // After a swipe, wait a bit before moving again.
  function pauseAfterTouch() {
    setTouched(true)
    clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => setTouched(false), 6000)
  }

  return (
    <div
      className="group/carousel relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
      }}
    >
      <ul
        ref={trackRef}
        onPointerDown={pauseAfterTouch}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:gap-4 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, index) => (
          <li key={getKey(item, index)} className={`shrink-0 snap-start ${itemClassName}`}>
            {renderItem(item, index)}
          </li>
        ))}
      </ul>

      {items.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="absolute left-2 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink opacity-0 shadow-pop transition hover:text-primary focus-visible:opacity-100 group-hover/carousel:opacity-100 md:grid"
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="absolute right-2 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink opacity-0 shadow-pop transition hover:text-primary focus-visible:opacity-100 group-hover/carousel:opacity-100 md:grid"
          >
            <Icon name="chevronRight" />
          </button>
        </>
      ) : null}
    </div>
  )
}
