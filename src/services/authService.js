import { getDefaultPrivateRoute, syncSettings } from './settingsService';
import {
  DEMO_LOGIN_EMAILS,
  DEMO_PROFILE,
  STORAGE_KEYS,
  readStorage,
  removeStorage,
  writeStorage,
} from './storageService';
import { clearAuthToken, extractApiMessage, isApiFallbackError, persistAuthToken, request } from './apiClient';
import { normalizeApiErrors, normalizeEmail, normalizeProfilePayload, unwrapApiData } from './apiMappers';

const socialProviders = {
  google: 'Google',
  x: 'X',
  github: 'GitHub',
};

const buildSession = (profile, overrides = {}) => ({
  id: profile.id,
  nombre: profile.nombre,
  apellidos: profile.apellidos,
  nombreCompleto: `${profile.nombre} ${profile.apellidos}`.trim(),
  email: profile.email,
  rol: profile.rol,
  matricula: profile.matricula,
  loginAt: new Date().toISOString(),
  authMethod: 'credentials',
  authProvider: 'email',
  authProviderLabel: 'Correo y contrasena',
  ...overrides,
});

const getProfileSnapshot = () => readStorage(STORAGE_KEYS.profile, DEMO_PROFILE);

const persistAuthState = (payload, overrides = {}) => {
  const responseData = unwrapApiData(payload);
  const fallbackProfile = getProfileSnapshot();
  const profile = normalizeProfilePayload(responseData, fallbackProfile);
  const token =
    responseData?.token ??
    responseData?.access_token ??
    responseData?.accessToken ??
    responseData?.authToken ??
    responseData?.bearerToken;

  if (token) {
    persistAuthToken(token);
  }

  writeStorage(STORAGE_KEYS.profile, {
    ...fallbackProfile,
    ...profile,
    password: fallbackProfile.password,
  });

  const session = buildSession(profile, overrides);
  writeStorage(STORAGE_KEYS.session, session);
  return session;
};

const getSession = () => readStorage(STORAGE_KEYS.session, null);
const isAuthenticated = () => Boolean(getSession());

const loginWithLocalCredentials = ({ email, password }) => {
  const profile = getProfileSnapshot();
  const inputEmail = normalizeEmail(email);
  const validEmails = new Set([...DEMO_LOGIN_EMAILS, normalizeEmail(profile.email)]);

  if (!validEmails.has(inputEmail)) {
    return { ok: false, message: 'El correo no esta registrado.' };
  }

  if (String(password ?? '') !== profile.password) {
    return { ok: false, message: 'La contrasena es incorrecta.' };
  }

  const session = buildSession(profile);
  clearAuthToken();
  writeStorage(STORAGE_KEYS.session, session);
  return { ok: true, session, redirectTo: getDefaultPrivateRoute() };
};

const loginUser = async ({ email, password }) => {
  try {
    const { data } = await request('/auth/login', {
      method: 'POST',
      body: {
        email: normalizeEmail(email),
        password: String(password ?? ''),
      },
    });

    let session = persistAuthState(data);
    const meResult = await syncCurrentUser();
    if (meResult.ok && meResult.session) {
      session = meResult.session;
    }

    await syncSettings().catch(() => null);

    return { ok: true, session, redirectTo: getDefaultPrivateRoute() };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return loginWithLocalCredentials({ email, password });
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo iniciar sesion.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const loginWithProvider = async (provider) => {
  const providerLabel = socialProviders[provider];

  if (!providerLabel) {
    return { ok: false, message: 'El proveedor seleccionado no esta disponible.' };
  }

  const profile = getProfileSnapshot();
  const session = buildSession(profile, {
    authMethod: 'social',
    authProvider: provider,
    authProviderLabel: providerLabel,
  });

  clearAuthToken();
  writeStorage(STORAGE_KEYS.session, session);
  return { ok: true, session, redirectTo: getDefaultPrivateRoute() };
};

const syncCurrentUser = async () => {
  try {
    const { data } = await request('/auth/me');
    const session = persistAuthState(data);
    return {
      ok: true,
      session,
      profile: readStorage(STORAGE_KEYS.profile, DEMO_PROFILE),
    };
  } catch (error) {
    if (isApiFallbackError(error)) {
      const session = getSession();
      return { ok: Boolean(session), session, profile: getProfileSnapshot() };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo recuperar la sesion actual.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const logoutUser = async () => {
  let errorMessage = '';

  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (error) {
    if (!isApiFallbackError(error) && error?.status !== 401) {
      errorMessage = extractApiMessage(error.payload, 'No se pudo cerrar la sesion.');
    }
  }

  clearAuthToken();
  removeStorage(STORAGE_KEYS.session);
  return errorMessage ? { ok: false, message: errorMessage } : { ok: true };
};

export {
  getSession,
  isAuthenticated,
  loginUser,
  loginWithProvider,
  logoutUser,
  syncCurrentUser,
};
