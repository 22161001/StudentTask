import { getDefaultPrivateRoute, syncSettings } from './settingsService';
import {
  DEMO_PROFILE,
  STORAGE_KEYS,
  readStorage,
  removeStorage,
  writeStorage,
} from './storageService';
import { clearAuthToken, extractApiMessage, isApiFallbackError, persistAuthToken, request } from './apiClient';
import { normalizeApiErrors, normalizeEmail, normalizeProfilePayload, unwrapApiData } from './apiMappers';
import { createUser, findUserByEmail } from './userService';

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
  authProviderLabel: 'Correo y contraseña',
  ...overrides,
});

const getProfileSnapshot = () => readStorage(STORAGE_KEYS.profile, DEMO_PROFILE);

const persistLocalUserSession = (profile, overrides = {}) => {
  const normalizedProfile = {
    ...DEMO_PROFILE,
    ...profile,
    rol: 'Estudiante',
  };
  const session = buildSession(normalizedProfile, overrides);

  clearAuthToken();
  writeStorage(STORAGE_KEYS.profile, normalizedProfile);
  writeStorage(STORAGE_KEYS.session, session);

  return session;
};

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
  const inputEmail = normalizeEmail(email);
  const user = findUserByEmail(inputEmail);

  if (!user) {
    return { ok: false, message: 'El correo no está registrado.' };
  }

  if (String(password ?? '') !== user.password) {
    return { ok: false, message: 'La contraseña es incorrecta.' };
  }

  const session = persistLocalUserSession(user);
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
      message: extractApiMessage(error.payload, 'No se pudo iniciar sesión.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const registerUser = (data) => {
  const result = createUser(data);

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    user: result.user,
    message: 'Tu cuenta se creó correctamente.',
  };
};

const loginWithProvider = async (provider) => {
  const providerLabel = socialProviders[provider];

  if (!providerLabel) {
    return { ok: false, message: 'El proveedor seleccionado no está disponible.' };
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
      message: extractApiMessage(error.payload, 'No se pudo recuperar la sesión actual.'),
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
      errorMessage = extractApiMessage(error.payload, 'No se pudo cerrar la sesión.');
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
  registerUser,
  syncCurrentUser,
};
