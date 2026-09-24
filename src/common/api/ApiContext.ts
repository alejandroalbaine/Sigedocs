import { createContext, useContext } from 'react';
import { api, type ApiClient } from './client.ts';

export const ApiContext = createContext<ApiClient>(api);

export function useApi(): ApiClient {
  return useContext(ApiContext);
}
