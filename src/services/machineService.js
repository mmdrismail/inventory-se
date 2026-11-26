import { storageService, STORAGE_KEYS } from './storageService';
import { apiClient } from './apiClient';
import {
  cleanStr,
  normalizeMachineDetails,
  buildMachineKey,
  inferBrandFromMachineName,
} from '../domain/machineSpecs';

class MachineService {
  getAll() {
    return storageService.getItem(STORAGE_KEYS.MACHINE_MODELS, []);
  }

  saveOrUpsert(data = {}) {
    const md = normalizeMachineDetails(data);
    if (!md.machineName && !md.model) {
      return { success: false, message: 'Machine name or model is required.' };
    }

    const machineKey = buildMachineKey(md);
    const all = this.getAll();
    const idx = all.findIndex(
      (m) =>
        (data.id && String(m.id || m._id) === String(data.id)) ||
        (machineKey && String(m.machineKey || buildMachineKey(m)) === machineKey)
    );

    const nowIso = new Date().toISOString();
    const brand = cleanStr(data.brand) || inferBrandFromMachineName(md.machineName);

    let saved;
    if (idx !== -1) {
      saved = {
        ...all[idx],
        ...md,
        brand,
        machineKey,
        categoryId: data.categoryId !== undefined ? data.categoryId : all[idx].categoryId || null,
        updatedAt: nowIso,
      };
      all[idx] = saved;
    } else {
      saved = {
        id: `mach-${Date.now()}`,
        ...md,
        brand,
        machineKey,
        categoryId: data.categoryId || null,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      all.unshift(saved);
    }

    storageService.setItem(STORAGE_KEYS.MACHINE_MODELS, all);

    const payload = {
      machineName: saved.machineName,
      brand: saved.brand,
      model: saved.model,
      type: saved.type,
      hp: saved.hp,
      ton: saved.ton,
      cylinder: saved.cylinder,
      others: saved.others,
      description: saved.description,
      categoryId: saved.categoryId,
    };

    const targetRemoteId = saved._id;
    const syncPromise = (
      targetRemoteId ? apiClient.put(`/machines/${targetRemoteId}`, payload) : apiClient.post('/machines', payload)
    )
      .then((res) => {
        if (res?.data?._id) {
          const cur = storageService.getItem(STORAGE_KEYS.MACHINE_MODELS, []);
          const pos = cur.findIndex((m) => m.id === saved.id || m.machineKey === machineKey);
          if (pos !== -1) {
            cur[pos] = { ...cur[pos], ...res.data, id: res.data._id, _id: res.data._id };
            storageService.setItem(STORAGE_KEYS.MACHINE_MODELS, cur);
          }
        }
        return res;
      })
      .catch((err) => {
        console.warn('[MongoDB MachineModel sync]:', err.message);
        return null;
      });

    return { success: true, machine: saved, syncPromise };
  }

  remove(id) {
    const all = this.getAll();
    const target = all.find((m) => String(m.id || m._id) === String(id));
    if (!target) {
      return { success: false, message: 'Machine profile not found.' };
    }
    const next = all.filter((m) => String(m.id || m._id) !== String(id));
    storageService.setItem(STORAGE_KEYS.MACHINE_MODELS, next);

    const syncPromise = target._id
      ? apiClient.delete(`/machines/${target._id}`).catch((err) => {
          console.warn('[MongoDB MachineModel delete]:', err.message);
          return null;
        })
      : Promise.resolve(null);

    return { success: true, message: `Machine "${target.machineName}" removed.`, syncPromise };
  }
}

export const machineService = new MachineService();
