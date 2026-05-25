import "@testing-library/jest-dom/vitest";

// NEXT_PUBLIC_API_URL es obligatoria fuera de mock mode; los tests usan mock.
process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
process.env.NEXT_PUBLIC_MOCK_MODE = "false";
