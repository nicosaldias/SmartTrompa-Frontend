import { beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// NEXT_PUBLIC_API_URL es obligatoria fuera de mock mode; los tests usan mock.
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
process.env.NEXT_PUBLIC_MOCK_MODE = "false";

// --- localStorage / sessionStorage bajo Node >= 22 ----------------------------
// Node trae desde la 22 un `globalThis.localStorage` EXPERIMENTAL que sin la
// bandera --localstorage-file evalua a undefined. Vitest, al montar el entorno
// jsdom, copia las claves de su window al global pero se salta las que ya
// existen ahi (populateGlobal -> getWindowKeys: `if (k in global) ...`), y
// `localStorage` no esta en su lista de excepciones. Resultado: el global de
// Node tapa al de jsdom y cualquier componente que lo use explota con
// "Cannot read properties of undefined (reading 'getItem')" — le pasaba a
// VisualizacionClient (vista lista/calendario) y a HistorialAlertasClient
// (tamano de pagina). No es un fallo del componente: en el navegador
// localStorage existe, y ambos accesos ya estan dentro de useEffect, o sea que
// nunca corren en SSR. Es el entorno de test el que se queda sin la API.
// Se instala una implementacion en memoria conforme a la interfaz Storage.
function crearStorage(): Storage {
  let datos = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return datos.size;
    },
    key: (i: number) => [...datos.keys()][i] ?? null,
    getItem: (k: string) => datos.get(String(k)) ?? null,
    setItem: (k: string, v: string) => void datos.set(String(k), String(v)),
    removeItem: (k: string) => void datos.delete(String(k)),
    clear: () => void (datos = new Map()),
  };
  return storage;
}

for (const nombre of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, nombre, {
    value: crearStorage(),
    configurable: true,
    writable: true,
  });
}

// Aislamiento entre tests: el setup corre una vez por fichero, asi que sin esto
// lo que un test escribe lo hereda el siguiente. Este beforeEach se registra
// antes que los de los ficheros de test, de modo que un test que quiera
// precargar una clave puede hacerlo en su propio beforeEach sin que se la borren.
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
