const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const REFRESH_COOKIE_NAME = 'hj_refresh'

/**
 * Los refresh tokens se guardan hasheados en la base, nunca en claro.
 * SHA-256 alcanza: a diferencia de una contraseña, el token es un valor
 * aleatorio de alta entropía, así que no hace falta un hash lento como bcrypt.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function createTokenService(env) {
  const refreshTtlMs = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

  function signAccessToken(user) {
    return jwt.sign(
      { sub: user._id.toString(), role: user.role, type: 'access' },
      env.JWT_SECRET,
      { expiresIn: env.ACCESS_TOKEN_TTL }
    )
  }

  function signRefreshToken(user) {
    // El `jti` identifica esta emisión concreta y es lo que permite rotar
    // y revocar tokens individualmente.
    const jti = crypto.randomUUID()
    const token = jwt.sign(
      { sub: user._id.toString(), jti, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` }
    )
    return { token, jti, expiresAt: new Date(Date.now() + refreshTtlMs) }
  }

  function verifyAccessToken(token) {
    const payload = jwt.verify(token, env.JWT_SECRET)
    if (payload.type !== 'access') {
      throw new jwt.JsonWebTokenError('Tipo de token inválido')
    }
    return payload
  }

  function verifyRefreshToken(token) {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET)
    if (payload.type !== 'refresh') {
      throw new jwt.JsonWebTokenError('Tipo de token inválido')
    }
    return payload
  }

  /**
   * `httpOnly` es el punto entero de este diseño: el refresh token no es
   * accesible desde JavaScript, así que un XSS no se lo puede llevar.
   *
   * En producción el frontend (Netlify) y la API (Render) son sitios
   * distintos, y una cookie cross-site necesita `SameSite=None` + `Secure`.
   * En desarrollo ambos son `localhost`, donde `Lax` alcanza y `Secure`
   * rompería porque no hay HTTPS.
   */
  function refreshCookieOptions() {
    return {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: env.isProduction ? 'none' : 'lax',
      maxAge: refreshTtlMs,
      path: '/api/auth',
    }
  }

  function setRefreshCookie(res, token) {
    res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions())
  }

  function clearRefreshCookie(res) {
    const { maxAge, ...options } = refreshCookieOptions()
    res.clearCookie(REFRESH_COOKIE_NAME, options)
  }

  return {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    setRefreshCookie,
    clearRefreshCookie,
    hashToken,
  }
}

module.exports = { createTokenService, hashToken, REFRESH_COOKIE_NAME }
