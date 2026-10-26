import { useState } from 'react'
import { Link } from 'react-router'
import Icon from '../ui/Icon.jsx'
import { categoryLink } from './CategoryMenu.jsx'

/*
 * Expandable category tree of ANY depth (renders itself for children).
 * Used in the mobile menu now and the Shop sidebar later.
 * Tap the name to open the category; tap the arrow to expand/collapse.
 */
export default function CategoryTree({ nodes, level = 0, activeSlug, onNavigate }) {
  return (
    <ul className={level === 0 ? '' : 'ml-3 border-l border-line pl-2'}>
      {nodes.map((node) => (
        <CategoryNode key={node._id} node={node} level={level} activeSlug={activeSlug} onNavigate={onNavigate} />
      ))}
    </ul>
  )
}

function containsSlug(node, slug) {
  return node.slug === slug || node.children.some((child) => containsSlug(child, slug))
}

function CategoryNode({ node, level, activeSlug, onNavigate }) {
  const hasChildren = node.children.length > 0
  const [expanded, setExpanded] = useState(() => Boolean(activeSlug && hasChildren && containsSlug(node, activeSlug)))
  const isActive = node.slug === activeSlug
  const panelId = `cat-${node._id}`

  return (
    <li>
      <div className="flex items-center">
        <Link
          to={categoryLink(node.slug)}
          onClick={onNavigate}
          aria-current={isActive ? 'page' : undefined}
          className={`flex min-h-11 flex-1 items-center rounded-lg px-3 text-sm transition-colors ${
            isActive ? 'bg-primary-soft font-semibold text-primary' : 'text-ink hover:bg-cream'
          } ${level === 0 ? 'font-medium' : ''}`}
        >
          <span className="flex-1">{node.name}</span>
          <span className="ml-2 text-xs text-muted">{node.totalProductCount}</span>
        </Link>
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
            className="icon-btn"
          >
            <Icon name="chevronDown" className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <span className="size-11 shrink-0" aria-hidden="true" />
        )}
      </div>
      {hasChildren && expanded ? (
        <div id={panelId}>
          <CategoryTree nodes={node.children} level={level + 1} activeSlug={activeSlug} onNavigate={onNavigate} />
        </div>
      ) : null}
    </li>
  )
}
