/**
 * Fetch con timeout y retry para manejar cold starts de Render
 */

export async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log(`[fetchWithTimeout] Llamando a: ${url}`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    console.log(`[fetchWithTimeout] Respuesta recibida: ${response.status} ${response.statusText}`);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`[fetchWithTimeout] Error:`, error);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout: La solicitud tardó más de ${timeout/1000} segundos. El servidor puede estar iniciando.`);
    }
    throw error;
  }
}

/**
 * Fetch con retry automático para manejar cold starts
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 2) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      // Primer intento: 60s, segundo: 90s
      const timeout = 60000 + (i * 30000);
      console.log(`[fetchWithRetry] Intento ${i + 1}/${maxRetries + 1} para ${url}`);
      console.log(`[fetchWithRetry] Timeout configurado: ${timeout/1000} segundos`);
      
      const response = await fetchWithTimeout(url, options, timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[fetchWithRetry] Respuesta no OK:`, response.status, errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      console.log(`[fetchWithRetry] ✓ Éxito en intento ${i + 1}`);
      return response;
    } catch (error) {
      lastError = error;
      console.error(`[fetchWithRetry] Intento ${i + 1} falló:`, error.message);
      
      // No reintentar si es un error 4xx (cliente) o no hay más intentos
      if (i === maxRetries || (error.message.includes('Error 4'))) {
        console.error(`[fetchWithRetry] No más reintentos. Error final:`, error);
        break;
      }
      
      // Esperar 3 segundos antes de reintentar
      console.log(`[fetchWithRetry] Esperando 3s antes de reintentar...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.error(`[fetchWithRetry] Todos los intentos fallaron`);
  throw lastError;
}
