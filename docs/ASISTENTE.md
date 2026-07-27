# El asistente (RAG) — contrato y límites

El endpoint `POST /api/asistente` no responde por sí mismo: hace de **BFF**
hacia un microservicio RAG en Python que **no vive en este repositorio**.

## Quién es autoridad de qué

Es la regla que ordena todo lo demás:

| Dato | Lo pone | Por qué |
| --- | --- | --- |
| El texto de la respuesta | El RAG | Es su trabajo |
| Las sugerencias de seguimiento | El RAG | Ídem |
| **Qué** productos mencionar (IDs) y en qué orden | El RAG | El ranking de relevancia es suyo |
| **Nombre, precio, disponibilidad, imagen** | **Express, leyendo MongoDB** | Ver abajo |

El RAG tiene su propio snapshot del catálogo dentro de los embeddings, y ese
snapshot envejece. Si un precio cambia en la base y el índice quedó viejo, el
modelo cotiza un precio que no existe.

Es la misma clase de bug que este repo ya había resuelto en pedidos —donde el
precio sale de la base y **nunca** del request— aplicada al lugar equivocado.
**Un LLM es una fuente no confiable exactamente igual que el navegador del
cliente.** Que hable bien no lo convierte en autoridad comercial.

Por eso `asistente.controller.js` se queda solo con los IDs y hace un
`Product.find({ _id: { $in: ids } })`, serializando el resultado con el
**mismo** `serializeProduct` que usa `/api/productos`. Un contrato, un lugar.

Efecto lateral valioso: aunque a alguien le funcione un *prompt injection* y
el modelo afirme "el sofá cuesta $1", el precio que se renderiza sale de
MongoDB. **La cadena de confianza queda cortada.**

## Qué se valida

Esta API valida con zod todo lo que entra. La respuesta del RAG **también**:

- `answer` — obligatoria, 1–5.000 caracteres. Si falta, es un `502`.
- `sources`, `suggestions`, `productos` — listas *tolerantes*: un elemento
  malformado se descarta solo a él, no a la lista entera, y después se recorta
  al tope (10 / 5 / 6).
- Los IDs de producto se validan contra el regex de ObjectId. Un id alucinado
  se descarta **antes** de llegar a la base, y no genera una tarjeta que
  linkee a un 404.
- Los campos de más que mande el RAG (`debug_prompt`, distancias, lo que sea)
  no se reenvían: el mapeo es una whitelist.

Cobertura en `backend/tests/asistenteContrato.test.js`, que mockea `fetch`
para poder simular un upstream que miente.

## Qué NO está resuelto

### 1. El microservicio puede estar abierto

Express manda `Authorization: Bearer $RAG_API_KEY` **si** la variable está
configurada. Eso es la mitad que le toca a este repo; la otra mitad —validar
esa cabecera— es del RAG.

Si el servicio de Cloud Run acepta invocaciones anónimas, **todo el rate
limiting de esta API es decorativo**: cualquiera que descubra la URL le pega
directo y quema la cuota del modelo. Revisalo.

### 2. Es una FAQ stateless, y la interfaz sugiere otra cosa

La API manda `{ question }` y nada más: **cero historial**. Pero el widget
muestra un scroll de conversación con chips de seguimiento, y desde que el
componente persiste al navegar, esa ilusión es más fuerte todavía.

Hoy funciona por accidente: las sugerencias que genera el RAG son
autocontenidas. Pero si el usuario pregunta por un sofá y después escribe
*"¿y cuánto sale el envío?"*, el modelo no tiene idea de qué "envío" le
hablan.

**Tener historial visual no convierte una API stateless en una conversación
contextual.** Hay que decidir cuál de las dos es:

- **FAQ stateless** (lo que es hoy): la UI debería dejar de prometer contexto
  — nada de scroll infinito ni chips que inviten a repreguntar sobre lo
  anterior.
- **Conversación contextual**: hay que mandar el historial al RAG, y eso
  arrastra costo de tokens por turno, un tope de ventana, y una política de
  retención (¿se guardan las conversaciones? ¿dónde? ¿por cuánto?).

Es una decisión de producto con consecuencias de plata y de privacidad, así
que **no se tomó por default**.

### 3. El "cerebro" no se puede auditar desde acá

Prompt, embeddings, estrategia de retrieval, configuración del modelo,
retención de datos y defensas contra prompt injection viven en el repo del
microservicio. Nada de lo que está acá los cubre.

Lo que sí hace este repo es **no depender de que estén bien**: valida la
entrada, valida la salida, y no le cree ni un dato comercial.
