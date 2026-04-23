import { STORAGE_KEYS, createId, readStorage, writeStorage } from './storageService';
import { extractApiMessage, isApiFallbackError, request } from './apiClient';
import { normalizeApiErrors, normalizeSubjectPayload, normalizeSubjectsPayload } from './apiMappers';

const getSubjects = () => readStorage(STORAGE_KEYS.subjects, []);

const persistSubjects = (subjects) => {
  writeStorage(STORAGE_KEYS.subjects, subjects);
  return subjects;
};

const validateSubject = (data) => {
  const nombre = String(data.nombre ?? '').trim();

  if (!nombre) {
    return {
      ok: false,
      errors: {
        nombre: 'El nombre de la materia es obligatorio.',
      },
    };
  }

  return { ok: true, nombre };
};

const createSubjectLocal = (data) => {
  const validation = validateSubject(data);
  if (!validation.ok) {
    return validation;
  }

  const subjects = getSubjects();
  const subject = {
    id: createId(subjects),
    nombre: validation.nombre,
    color: String(data.color ?? '#2563eb').trim() || '#2563eb',
    descripcion: String(data.descripcion ?? '').trim(),
  };

  const nextSubjects = persistSubjects([...subjects, subject]);
  return { ok: true, subject, subjects: nextSubjects };
};

const updateSubjectLocal = (subjectId, data) => {
  const validation = validateSubject(data);
  if (!validation.ok) {
    return validation;
  }

  const subjects = getSubjects();
  const nextSubjects = subjects.map((subject) =>
    subject.id === subjectId
      ? {
          ...subject,
          nombre: validation.nombre,
          color: String(data.color ?? subject.color).trim() || '#2563eb',
          descripcion: String(data.descripcion ?? '').trim(),
        }
      : subject,
  );

  persistSubjects(nextSubjects);
  return { ok: true, subjects: nextSubjects };
};

const deleteSubjectLocal = (subjectId) => {
  const tasks = readStorage(STORAGE_KEYS.tasks, []);
  const linkedTasks = tasks.filter((task) => task.materiaId === subjectId);

  if (linkedTasks.length > 0) {
    return {
      ok: false,
      message: `No puedes eliminar esta materia porque tiene ${linkedTasks.length} tarea(s) asociada(s).`,
    };
  }

  const subjects = getSubjects();
  const nextSubjects = persistSubjects(subjects.filter((subject) => subject.id !== subjectId));
  return { ok: true, subjects: nextSubjects };
};

const syncSubjects = async () => {
  try {
    const { data } = await request('/materias');
    const subjects = persistSubjects(normalizeSubjectsPayload(data));
    return { ok: true, subjects };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return { ok: true, subjects: getSubjects() };
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudieron cargar las materias.'),
      errors: normalizeApiErrors(error.payload),
      subjects: getSubjects(),
    };
  }
};

const createSubject = async (data) => {
  try {
    const validation = validateSubject(data);
    if (!validation.ok) {
      return validation;
    }

    const { data: responseData } = await request('/materias', {
      method: 'POST',
      body: {
        nombre: validation.nombre,
        color: String(data.color ?? '#2563eb').trim() || '#2563eb',
        descripcion: String(data.descripcion ?? '').trim(),
      },
    });

    const syncResult = await syncSubjects();
    const subjects = syncResult.subjects ?? getSubjects();
    const subject = normalizeSubjectPayload(responseData);
    return { ok: true, subject, subjects };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return createSubjectLocal(data);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo crear la materia.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const updateSubject = async (subjectId, data) => {
  try {
    const validation = validateSubject(data);
    if (!validation.ok) {
      return validation;
    }

    await request(`/materias/${subjectId}`, {
      method: 'PUT',
      body: {
        nombre: validation.nombre,
        color: String(data.color ?? '#2563eb').trim() || '#2563eb',
        descripcion: String(data.descripcion ?? '').trim(),
      },
    });

    const syncResult = await syncSubjects();
    return { ok: true, subjects: syncResult.subjects ?? getSubjects() };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return updateSubjectLocal(subjectId, data);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo actualizar la materia.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

const deleteSubject = async (subjectId) => {
  try {
    await request(`/materias/${subjectId}`, { method: 'DELETE' });
    const syncResult = await syncSubjects();
    return { ok: true, subjects: syncResult.subjects ?? getSubjects() };
  } catch (error) {
    if (isApiFallbackError(error)) {
      return deleteSubjectLocal(subjectId);
    }

    return {
      ok: false,
      message: extractApiMessage(error.payload, 'No se pudo eliminar la materia.'),
      errors: normalizeApiErrors(error.payload),
    };
  }
};

export { createSubject, deleteSubject, getSubjects, syncSubjects, updateSubject };
