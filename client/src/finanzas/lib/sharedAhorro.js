export function isSharedAhorro(item) {
  return Boolean(item?.shared)
}

export function asMember(account) {
  return {
    id: account.id,
    username: account.username,
  }
}

export function samePerson(member, account) {
  if (!member || !account) return false
  if (member.id && account.id && member.id === account.id) return true
  return String(member.username || '').toLowerCase() === String(account.username || '').toLowerCase()
}

export function isAhorroOwner(item, account) {
  if (!item || !account) return false
  if (!item.shared) return true
  return samePerson({ id: item.ownerId, username: item.ownerUsername }, account)
}

export function isAhorroMember(item, account) {
  if (!item || !account) return false
  if (!item.shared) return true
  return (item.members || []).some((member) => samePerson(member, account))
}

export function memberLabel(item) {
  const names = (item.members || []).map((member) => member.username).filter(Boolean)
  if (!names.length) return item.ownerUsername || ''
  return names.join(', ')
}

export function makeSharedAhorro(item, owner) {
  return {
    ...item,
    shared: true,
    ownerId: owner.id,
    ownerUsername: owner.username,
    members: [asMember(owner)],
  }
}

export function withAddedMembers(item, users) {
  const members = [...(item.members || [])]
  for (const user of users) {
    if (!user?.id && !user?.username) continue
    if (members.some((member) => samePerson(member, user))) continue
    members.push({ id: user.id, username: user.username })
  }
  return { ...item, shared: true, members }
}

export function upsertAhorro(ledger, ahorro) {
  const list = ledger.ahorros || []
  const exists = list.some((row) => row.id === ahorro.id)
  return {
    ...ledger,
    ahorros: exists ? list.map((row) => (row.id === ahorro.id ? ahorro : row)) : [ahorro, ...list],
  }
}

export function stripAhorro(ledger, id) {
  return {
    ...ledger,
    ahorros: (ledger.ahorros || []).filter((row) => row.id !== id),
  }
}

function cloneAhorro(ahorro) {
  return structuredClone(ahorro)
}

export function syncSharedAhorrosInStore(store, writerId) {
  const writer = store.accounts.find((item) => item.id === writerId)
  if (!writer?.data) return store
  const shared = (writer.data.ahorros || []).filter((item) => item.shared)

  return {
    ...store,
    accounts: store.accounts.map((account) => {
      if (account.id === writerId) return account
      let data = account.data
      for (const ahorro of shared) {
        if (isAhorroMember(ahorro, account)) {
          data = upsertAhorro(data, cloneAhorro(ahorro))
        } else if ((data.ahorros || []).some((row) => row.id === ahorro.id)) {
          data = stripAhorro(data, ahorro.id)
        }
      }
      return { ...account, data }
    }),
  }
}

export function applySharedDeletions(store, writerId, previousAhorros) {
  const writer = store.accounts.find((item) => item.id === writerId)
  if (!writer) return store
  const nextIds = new Set((writer.data.ahorros || []).map((item) => item.id))
  const deletedOwned = (previousAhorros || []).filter(
    (item) => item.shared && isAhorroOwner(item, writer) && !nextIds.has(item.id),
  )
  if (!deletedOwned.length) return store
  return {
    ...store,
    accounts: store.accounts.map((account) => {
      if (account.id === writerId) return account
      let data = account.data
      for (const ahorro of deletedOwned) {
        data = stripAhorro(data, ahorro.id)
      }
      return { ...account, data }
    }),
  }
}
