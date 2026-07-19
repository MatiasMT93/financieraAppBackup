const DIACRITICS = /[̀-ͯ]/g;

/**
 * Normaliza texto para comparaciones de búsqueda: minúsculas y sin acentos,
 * así "jose"/"José" o "gonzalez"/"González" matchean sin importar cómo los
 * haya tipeado el usuario.
 */
export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(DIACRITICS, '').toLowerCase();
}
