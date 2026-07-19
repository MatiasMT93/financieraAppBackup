import type { QueryClient } from '@tanstack/react-query';

// Distintas pantallas cachean las operaciones bajo claves distintas
// ('operations', 'operations-admin', 'operations-historial', etc.) según
// sus propios filtros. Invalidar solo 'operations' no alcanza a las demás
// porque TanStack Query matchea por igualdad exacta de cada elemento de la
// key, no por substring — así que un cambio nunca las refrescaba.
export function invalidateOperationsQueries(queryClient: QueryClient) {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && key.startsWith('operations');
    },
  });
}
