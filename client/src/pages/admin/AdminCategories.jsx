import { useMemo, useState } from 'react'
import Icon from '../../components/ui/Icon.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import { useCart } from '../../context/CartContext.jsx'
import { useApi } from '../../hooks/useApi.js'
import { apiRequest } from '../../lib/api.js'
import { flattenCategories } from '../../lib/categoryOptions.js'

// All ids inside a branch (the category itself + every descendant).
function branchIds(node) {
  return [node._id, ...node.children.flatMap(branchIds)]
}

// Keeps matching categories and the path to them.
function filterTree(nodes, term) {
  if (!term) return nodes
  return nodes.flatMap((node) => {
    const children = filterTree(node.children, term)
    return node.name.toLowerCase().includes(term) || children.length ? [{ ...node, children }] : []
  })
}

/*
 * Category tree manager: add (at any level), rename, move, reorder,
 * publish/hide and delete safely. Every rule is enforced by the server.
 */
export default function AdminCategories() {
  const { data, error, loading, reload } = useApi('/admin/categories')
  const { notify } = useCart()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null) // { type, node }
  const [busy, setBusy] = useState(false)

  const tree = useMemo(() => data?.data.tree || [], [data])
  const flat = useMemo(() => flattenCategories(tree), [tree])
  const shown = useMemo(() => filterTree(tree, search.trim().toLowerCase()), [tree, search])

  async function run(request, success) {
    setBusy(true)
    try {
      await request()
      notify(success, 'success')
      setDialog(null)
      reload()
      return true
    } catch (err) {
      notify(err.message, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  function move(node, siblings, direction) {
    const index = siblings.findIndex((s) => s._id === node._id)
    const target = index + direction
    if (target < 0 || target >= siblings.length) return
    const order = [...siblings]
    ;[order[index], order[target]] = [order[target], order[index]]
    run(
      () => apiRequest('/admin/categories/reorder', { method: 'PATCH', body: { items: order.map((s, i) => ({ id: s._id, sortOrder: i })) } }),
      'Order updated'
    )
  }

  const actions = {
    add: (parent) => setDialog({ type: 'add', node: parent }),
    edit: (node) => setDialog({ type: 'edit', node }),
    move: (node) => setDialog({ type: 'move', node }),
    remove: (node) => setDialog({ type: 'delete', node }),
    togglePublish: (node) =>
      run(
        () => apiRequest(`/admin/categories/${node._id}`, { method: 'PATCH', body: { isPublished: !node.isPublished } }),
        node.isPublished ? `${node.name} hidden` : `${node.name} published`
      ),
    reorder: move,
  }

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Categories</h1>
        <button type="button" className="btn-primary" onClick={() => actions.add(null)}>
          + New main category
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Add subcategories inside any category, up to {data?.data.maxLevels || 10} levels. Hiding a category hides everything inside it.
      </p>

      <label htmlFor="cat-search" className="sr-only">
        Search categories
      </label>
      <input
        id="cat-search"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search categories…"
        className="mt-4 h-11 w-full rounded-full border border-line bg-white px-4 text-base sm:max-w-sm sm:text-sm"
      />

      <div className="mt-4 rounded-2xl border border-line bg-white p-2 sm:p-3">
        {loading && !data ? <Spinner className="p-3" label="Loading categories" /> : null}
        {error ? <p className="p-3 text-red-600">{error.message}</p> : null}
        {data && shown.length === 0 ? <p className="p-3 text-sm text-muted">No categories found.</p> : null}
        <TreeLevel nodes={shown} actions={actions} busy={busy} forceOpen={Boolean(search)} />
      </div>

      {dialog ? <CategoryDialog dialog={dialog} flat={flat} busy={busy} run={run} onClose={() => setDialog(null)} /> : null}
    </div>
  )
}

function TreeLevel({ nodes, actions, busy, forceOpen, level = 0 }) {
  return (
    <ul className={level ? 'ml-4 border-l border-line pl-2 sm:ml-6' : ''}>
      {nodes.map((node, i) => (
        <TreeNode key={node._id} node={node} siblings={nodes} index={i} actions={actions} busy={busy} forceOpen={forceOpen} level={level} />
      ))}
    </ul>
  )
}

function TreeNode({ node, siblings, index, actions, busy, forceOpen, level }) {
  const [open, setOpen] = useState(level === 0 ? false : true)
  const expanded = forceOpen || open
  const small = 'grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-cream hover:text-ink disabled:opacity-30'

  return (
    <li>
      <div className="flex flex-wrap items-center gap-1 rounded-xl px-1 py-1.5 hover:bg-cream/60">
        {node.children.length ? (
          <button type="button" className={small} onClick={() => setOpen((v) => !v)} aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}>
            <Icon name="chevronDown" className={`size-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
          </button>
        ) : (
          <span className="size-9 shrink-0" />
        )}

        <span className="min-w-0 flex-1 basis-40">
          <span className={`block truncate font-semibold ${node.isVisible ? '' : 'text-muted'}`}>{node.name}</span>
          <span className="block text-xs text-muted">
            {node.directProductCount} products here · {node.totalProductCount} in total
            {!node.isPublished ? ' · Hidden' : !node.isVisible ? ' · Hidden by a parent' : ''}
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-0.5">
          <button type="button" className={small} disabled={busy || index === 0} onClick={() => actions.reorder(node, siblings, -1)} aria-label={`Move ${node.name} up`}>
            ↑
          </button>
          <button type="button" className={small} disabled={busy || index === siblings.length - 1} onClick={() => actions.reorder(node, siblings, 1)} aria-label={`Move ${node.name} down`}>
            ↓
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => actions.togglePublish(node)}
            className={`min-h-9 rounded-full px-3 text-xs font-bold ${node.isPublished ? 'bg-primary-soft text-primary' : 'bg-line text-muted'}`}
            aria-label={`${node.isPublished ? 'Hide' : 'Publish'} ${node.name}`}
          >
            {node.isPublished ? 'Published' : 'Hidden'}
          </button>
          <button type="button" className="min-h-9 rounded-full px-2 text-xs font-bold text-primary hover:bg-primary-soft" onClick={() => actions.add(node)}>
            + Sub
          </button>
          <button type="button" className="min-h-9 rounded-full px-2 text-xs font-semibold hover:bg-cream" onClick={() => actions.edit(node)}>
            Edit
          </button>
          <button type="button" className="min-h-9 rounded-full px-2 text-xs font-semibold hover:bg-cream" onClick={() => actions.move(node)}>
            Move
          </button>
          <button type="button" className="min-h-9 rounded-full px-2 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => actions.remove(node)}>
            Delete
          </button>
        </span>
      </div>
      {node.children.length && expanded ? (
        <TreeLevel nodes={node.children} actions={actions} busy={busy} forceOpen={forceOpen} level={level + 1} />
      ) : null}
    </li>
  )
}

// Add / edit / move / delete dialog.
function CategoryDialog({ dialog, flat, busy, run, onClose }) {
  const { type, node } = dialog
  const [name, setName] = useState(type === 'edit' ? node.name : '')
  const [description, setDescription] = useState(type === 'edit' ? node.description || '' : '')
  const [slug, setSlug] = useState(type === 'edit' ? node.slug : '')
  const [parent, setParent] = useState('')
  const [moveProductsTo, setMoveProductsTo] = useState('')
  const [moveChildrenTo, setMoveChildrenTo] = useState('')

  // A category can never go inside itself or its own subcategories.
  const blocked = node && (type === 'move' || type === 'delete') ? new Set(branchIds(node)) : new Set()
  const targets = flat.filter((c) => !blocked.has(c._id))

  const titles = {
    add: node ? `Add subcategory in “${node.name}”` : 'New main category',
    edit: `Edit “${node?.name}”`,
    move: `Move “${node?.name}”`,
    delete: `Delete “${node?.name}”`,
  }

  function submit(event) {
    event.preventDefault()
    if (type === 'add') {
      if (!name.trim()) return
      run(
        () => apiRequest('/admin/categories', { method: 'POST', body: { name: name.trim(), description, parentCategory: node?._id || null } }),
        'Category added'
      )
    } else if (type === 'edit') {
      run(
        () => apiRequest(`/admin/categories/${node._id}`, { method: 'PATCH', body: { name: name.trim(), description, slug } }),
        'Category saved'
      )
    } else if (type === 'move') {
      run(
        () => apiRequest(`/admin/categories/${node._id}/move`, { method: 'PATCH', body: { parentCategory: parent || null } }),
        'Category moved'
      )
    } else {
      const body = {}
      if (node.directProductCount) body.moveProductsTo = moveProductsTo
      if (node.children.length) body.moveChildrenTo = moveChildrenTo || null
      run(() => apiRequest(`/admin/categories/${node._id}`, { method: 'DELETE', body }), 'Category deleted')
    }
  }

  const input = 'mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-base'
  const select = (value, onChange, placeholder, allowRoot) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input} required={!allowRoot}>
      {allowRoot ? <option value="">— Top level (main category) —</option> : <option value="">{placeholder}</option>}
      {targets.map((c) => (
        <option key={c._id} value={c._id}>
          {c.label}
        </option>
      ))}
    </select>
  )
  const deleteBlocked = type === 'delete' && node.directProductCount > 0 && !moveProductsTo

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-0 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="cat-dialog-title">
      <form onSubmit={submit} className="max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-pop sm:max-w-lg sm:rounded-3xl sm:p-6">
        <h2 id="cat-dialog-title" className="text-lg font-bold">
          {titles[type]}
        </h2>

        {type === 'add' || type === 'edit' ? (
          <div className="mt-4 space-y-4">
            <label className="block text-sm font-semibold">
              Name
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className={input} />
            </label>
            <label className="block text-sm font-semibold">
              Description (optional)
              <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className={input} />
            </label>
            {type === 'edit' ? (
              <label className="block text-sm font-semibold">
                Link name (slug)
                <input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={120} className={input} />
                <span className="mt-1 block text-xs font-normal text-muted">Changing this breaks old shared links. Renaming the category does not change it.</span>
              </label>
            ) : null}
          </div>
        ) : null}

        {type === 'move' ? (
          <label className="mt-4 block text-sm font-semibold">
            New place
            {select(parent, setParent, '', true)}
            <span className="mt-1 block text-xs font-normal text-muted">Its subcategories and products move together with it.</span>
          </label>
        ) : null}

        {type === 'delete' ? (
          <div className="mt-4 space-y-4 text-sm">
            {!node.directProductCount && !node.children.length ? (
              <p>This category is empty and will be deleted permanently.</p>
            ) : (
              <p className="rounded-xl bg-accent-soft p-3">
                This category contains <strong>{node.children.length} subcategories</strong> and <strong>{node.directProductCount} products</strong>. Choose where they go - nothing is deleted with it. Tip: you can also just <em>hide</em> it.
              </p>
            )}
            {node.directProductCount ? (
              <label className="block font-semibold">
                Move its products to
                {select(moveProductsTo, setMoveProductsTo, 'Choose a category…', false)}
              </label>
            ) : null}
            {node.children.length ? (
              <label className="block font-semibold">
                Move its subcategories to
                {select(moveChildrenTo, setMoveChildrenTo, '', true)}
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || deleteBlocked}
            className={type === 'delete' ? 'btn bg-red-600 text-white hover:bg-red-700' : 'btn-primary'}
          >
            {busy ? 'Saving…' : type === 'delete' ? 'Delete' : type === 'move' ? 'Move' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
