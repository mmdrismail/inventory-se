import { storageService } from '../../services/storageService';

/**
 * Two-way offline/online reconciliation helpers extracted from AppDataContext
 * to keep context state modular and prevent duplicate diff logic.
 */

export const normalizeReconcileKey = (val) => String(val || '').trim().toLowerCase();

export const normalizeReconcilePhone = (val) => {
  const digits = String(val || '').replace(/\D+/g, '');
  return digits.length >= 6 ? digits : '';
};

const TEMP_LOCAL_ID_RE = /^(cust|sal|quote|mr|pc|mach|cat)-\d{10,}/;

const IGNORED_DIFF_KEYS = new Set([
  'id',
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'totalSales',
  'totalPaid',
  'totalDue',
]);

const isNonEmpty = (val) =>
  Array.isArray(val) ? val.length > 0 : val !== undefined && val !== null && String(val).trim() !== '';

export const reconcileAndPushNewerLocal = (localList, remoteList, pushFn, options = {}) => {
  const { getFallbackKeys, createFn, shouldAutoCreate, entityTag = 'item' } = options;

  if (!globalThis.__stocklinePendingTempCreates) {
    globalThis.__stocklinePendingTempCreates = new Set();
  }
  const pendingTempCreates = globalThis.__stocklinePendingTempCreates;

  const locals = Array.isArray(localList) ? localList : [];
  const remotes = Array.isArray(remoteList) ? remoteList : [];

  const localById = new Map();
  for (const item of locals) {
    const k = item?._id || item?.id;
    if (k) localById.set(String(k), item);
  }

  const remoteKeyCounts = new Map();
  if (typeof getFallbackKeys === 'function') {
    for (const remote of remotes) {
      const keys = new Set(getFallbackKeys(remote).filter(Boolean));
      for (const k of keys) {
        remoteKeyCounts.set(k, (remoteKeyCounts.get(k) || 0) + 1);
      }
    }
  }

  const matchedLocals = new Set();
  const primaryMatches = new Map();
  for (const remote of remotes) {
    const rid = String(remote._id || remote.id);
    const exactLocal = localById.get(rid);
    if (exactLocal) {
      primaryMatches.set(rid, exactLocal);
      matchedLocals.add(exactLocal);
    }
  }

  const findFallbackLocal = (remote) => {
    if (typeof getFallbackKeys !== 'function') return null;
    const keys = getFallbackKeys(remote).filter((k) => k && remoteKeyCounts.get(k) === 1);
    for (const key of keys) {
      const candidates = locals.filter((loc) => !matchedLocals.has(loc) && getFallbackKeys(loc).includes(key));
      if (candidates.length === 1) return candidates[0];
    }
    return null;
  };

  const pushPromises = [];
  const mergeAndMaybePush = (rid, remote, local) => {
    const localTime = local?.updatedAt ? new Date(local.updatedAt).getTime() : NaN;
    const remoteTime = remote?.updatedAt ? new Date(remote.updatedAt).getTime() : NaN;
    const isNewerLocal =
      !Number.isNaN(localTime) &&
      ((!Number.isNaN(remoteTime) && localTime > remoteTime + 2000) || Number.isNaN(remoteTime));

    if (isNewerLocal) {
      const nextItem = { ...remote, ...local, id: rid, _id: rid };
      if (typeof pushFn === 'function') {
        pushPromises.push(pushFn(rid, nextItem));
      }
      return nextItem;
    }

    if (local && !local._id) {
      let filledAny = false;
      const patched = { ...remote };
      for (const [k, v] of Object.entries(local)) {
        if (IGNORED_DIFF_KEYS.has(k)) continue;
        if (isNonEmpty(v) && !isNonEmpty(patched[k])) {
          patched[k] = v;
          filledAny = true;
        }
      }
      if (filledAny) {
        const nextItem = { ...patched, id: rid, _id: rid };
        if (typeof pushFn === 'function') {
          pushPromises.push(pushFn(rid, nextItem));
        }
        return nextItem;
      }
    }

    return { ...remote, id: rid, _id: rid };
  };

  const merged = remotes.map((remote) => {
    const rid = String(remote._id || remote.id);
    const local = primaryMatches.get(rid) || findFallbackLocal(remote);
    if (local) {
      matchedLocals.add(local);
      return mergeAndMaybePush(rid, remote, local);
    }
    return { ...remote, id: rid, _id: rid };
  });

  for (const local of locals) {
    if (matchedLocals.has(local) || local?._id) continue;
    const localId = String(local?.id || '');
    if (!TEMP_LOCAL_ID_RE.test(localId)) continue;
    if (typeof shouldAutoCreate === 'function' && !shouldAutoCreate(local)) continue;

    const preserved = { ...local, id: localId };
    merged.push(preserved);

    const dedupeKey = `${entityTag}:${localId}`;
    if (typeof createFn === 'function' && !pendingTempCreates.has(dedupeKey)) {
      pendingTempCreates.add(dedupeKey);
      const promise = Promise.resolve(createFn(preserved))
        .then((res) => {
          const created = res?.data?._id ? res.data : res?._id ? res : null;
          if (!created) {
            pendingTempCreates.delete(dedupeKey);
            return null;
          }
          const createdId = String(created._id || created.id);
          const idx = merged.findIndex((m) => String(m.id || m._id) === localId);
          if (idx !== -1) {
            merged[idx] = { ...preserved, ...created, id: createdId, _id: createdId };
          }
          return { __created: true, data: created };
        })
        .catch(() => {
          pendingTempCreates.delete(dedupeKey);
          return null;
        });
      pushPromises.push(promise);
    }
  }

  return { merged, pushPromises };
};

export const settleReconcilePushes = async (pushPromises, merged, setState, storageKey) => {
  if (!pushPromises || pushPromises.length === 0) return;
  const results = await Promise.allSettled(pushPromises);
  const hasCreated = results.some((r) => r.status === 'fulfilled' && r.value?.__created);
  if (hasCreated) {
    const snapshot = [...merged];
    setState(snapshot);
    storageService.setItem(storageKey, snapshot);
  }
};
