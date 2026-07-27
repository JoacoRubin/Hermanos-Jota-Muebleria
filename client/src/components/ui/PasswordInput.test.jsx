import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordInput from './PasswordInput'

const mostrar = () => screen.getByRole('button', { name: 'Mostrar contraseña' })
const ocultar = () => screen.getByRole('button', { name: 'Ocultar contraseña' })

describe('PasswordInput', () => {
  it('arranca oculto', () => {
    render(<PasswordInput id="p" aria-label="Contraseña" />)

    expect(screen.getByLabelText('Contraseña')).toHaveAttribute(
      'type',
      'password'
    )
  })

  it('el botón alterna entre mostrar y ocultar', async () => {
    const user = userEvent.setup()
    render(<PasswordInput id="p" aria-label="Contraseña" />)

    await user.click(mostrar())
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text')

    await user.click(ocultar())
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute(
      'type',
      'password'
    )
  })

  it('mostrar la contraseña no altera el valor tipeado', async () => {
    const user = userEvent.setup()
    render(<PasswordInput id="p" aria-label="Contraseña" defaultValue="" />)

    await user.type(screen.getByLabelText('Contraseña'), 'miClave123')
    await user.click(mostrar())

    expect(screen.getByLabelText('Contraseña')).toHaveValue('miClave123')
  })

  // ── El bug que este componente NO puede tener ───────────────────────────
  // Un <button> sin `type` dentro de un <form> es submit por defecto. Sin
  // `type="button"`, hacer click en el ojo enviaría el formulario intentando
  // loguear con la contraseña a medio escribir.
  it('el botón NO envía el formulario que lo contiene', async () => {
    const onSubmit = vi.fn((e) => e.preventDefault())
    const user = userEvent.setup()

    render(
      <form onSubmit={onSubmit}>
        <PasswordInput id="p" aria-label="Contraseña" />
      </form>
    )

    await user.click(mostrar())

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('reenvía los atributos del input nativo', () => {
    render(
      <PasswordInput
        id="p"
        aria-label="Contraseña"
        name="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Tu contraseña"
      />
    )

    const input = screen.getByLabelText('Contraseña')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('name', 'password')
    expect(input).toHaveAttribute('minLength', '8')
    expect(input).toHaveAttribute('autoComplete', 'new-password')
    expect(input).toHaveAttribute('placeholder', 'Tu contraseña')
  })

  it('anuncia el estado para lectores de pantalla', async () => {
    const user = userEvent.setup()
    render(<PasswordInput id="p" aria-label="Contraseña" />)

    expect(mostrar()).toHaveAttribute('aria-pressed', 'false')

    await user.click(mostrar())

    expect(ocultar()).toHaveAttribute('aria-pressed', 'true')
  })
})
