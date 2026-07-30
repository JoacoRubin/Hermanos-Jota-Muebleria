import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

beforeEach(() => {
  // El carrito se persiste en localStorage y el chat de KIMBAI en
  // sessionStorage: si no se limpian, un test le deja basura al siguiente y
  // los fallos se vuelven imposibles de leer.
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
})
