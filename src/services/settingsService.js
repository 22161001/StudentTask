import { DEMO_SETTINGS, STORAGE_KEYS, readStorage, writeStorage } from './storageService';
import { extractApiMessage, isApiFallbackError, request } from './apiClient';
import { normalizeApiErrors, normalizeSettingsPayload, serializeSettingsPayload } from './apiMappers';

const defaultRouteMap = {
  dashboard: '/dashboard',
  materias: '/materias',
  tareas: '/tareas',
  agenda: '/agenda',
  'tareas-asignadas': '/tareas-asignadas',
  reportes: '/reportes',
  seguimiento: '/seguimiento',
  perfil: '/perfil',
  configuracion: '/configuracion',
};

const getSettings = () => readStorage(STORAGE_KEYS.settings, DEMO_SETTINGS);

const persistSettings = (settingsLike) => {
  const settings = normalizeSettingsPayload(settingsLike, getSettings());
  writeStorage(STORAGE_KEYS.settings, settings);
  return settings;
};

const syncSettings = async () => {
  try {
    const { data } = await request('/configuracion');
    const settings = persistSettings(data);
    return { ok: true, settings };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return {
        ok: true,
        settings: getSettings(),
        message: 'No se pudo cargar la configuración desde el servidor. Se muestran datos locales de respaldo.',
        fallback: true,
      };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo cargar la configuración.'),
      errors: normalizeApiErrors(error.payload),
      settings: getSettings(),
    };
  }
};

const updateSettings = async (changes) => {
  const currentSettings = getSettings();
  const nextSettings = normalizeSettingsPayload({ ...currentSettings, ...changes }, currentSettings);

  try {
    const { data } = await request('/configuracion', {
      method: 'PUT',
      body: serializeSettingsPayload(nextSettings),
    });

    const settings = persistSettings(data ?? nextSettings);
    return { ok: true, settings };
  } catch (error) {
    if (isApiFallbackError(error)) {
      const settings = persistSettings(nextSettings);
      return {
        ok: true,
        settings,
        message: 'No se pudo conectar con el servidor. La configuración quedó guardada localmente.',
        fallback: true,
      };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo guardar la configuración.'),
      errors: normalizeApiErrors(error.payload),
      settings: currentSettings,
    };
  }
};

const getDefaultPrivateRoute = () => defaultRouteMap[getSettings().vistaDefault] ?? '/dashboard';

export { defaultRouteMap, getDefaultPrivateRoute, getSettings, persistSettings, syncSettings, updateSettings };
