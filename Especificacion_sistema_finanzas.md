# Especificación: Sistema de gestión financiera personal

Documento transcrito a partir del diagrama de flujo del sistema. Incluye módulos, campos, lógica de negocio, relaciones y la evaluación de viabilidad para integrarlo como apartado dentro de la app actual.

---

## 1. Visión general

Aplicación de finanzas personales con cinco módulos principales. **Todos los montos están en soles peruanos (S/ / PEN).**

1. **Líneas o créditos**
2. **Deudas totales**
3. **Pagos mensuales**
4. **Ingresar sueldo o ingresos**
5. **Ahorros**

El flujo lógico es:

```text
DEUDAS TOTALES ──► PAGOS MENSUALES
                         ▲
                         │  (el ingreso cubre los pagos)
                         │
              INGRESAR SUELDO O INGRESOS
                         │
                         │  (si hay remanente)
                         ▼
                      AHORROS

LÍNEAS O CRÉDITOS  (módulo de referencia / respaldo ante déficit)
```

- **Deudas totales** alimenta **Pagos mensuales**.
- **Ingresos** se usa para cubrir **Pagos mensuales** y, si sobra, se destina a **Ahorros**.
- **Líneas o créditos** es un módulo independiente de seguimiento, pero el motor de recomendaciones lo usa como recurso posible cuando hay déficit.

---

## 2. Módulos y lógica

### 2.1 Líneas o créditos

**Propósito:** registrar y consultar las líneas de crédito disponibles.

**Campos y reglas:**

1. Tipo o nombre de la línea de crédito.
2. Monto de cada línea.
3. Monto total de todas las líneas (suma automática).
4. La entrada será editable.

---

### 2.2 Deudas totales

**Propósito:** gestionar el panorama de deudas. Este módulo se conecta con **Pagos mensuales**.

**Campos y reglas:**

1. Tipo de deuda o nombre.
2. Monto de la deuda por fila y total de todas las deudas (suma automática).
3. Fecha de registro automática.
4. Barra de progreso según los pagos registrados en **Pagos mensuales**.
5. Codificación visual por color para distinguir deudas de monto grande y de monto pequeño.
6. La entrada será editable.

**Nota:** el sistema mantendrá un **histórico** de estos datos.

---

### 2.3 Pagos mensuales

**Propósito:** registrar pagos concretos hacia las deudas. Recibe datos de **Deudas totales** e interactúa con **Ingresos**.

**Campos y reglas:**

1. Tipo de deuda o nombre. Campo seleccionable: puede tomar valores de la lista de **Deudas totales** o ingresarse de forma manual.
2. Monto de deuda/pago por fila y total de deudas mensuales.
   - Si se selecciona una deuda de la lista de **Deudas totales**, al ingresar un pago mensual aquí **debe reducirse automáticamente** el monto correspondiente de esa deuda total.
3. Fecha de registro automática.
4. Codificación visual por color para distinguir pagos grandes y pequeños.
5. La entrada será editable.

**Nota:** este módulo mantendrá un **histórico de pagos mensuales** para poder hacer seguimiento en el tiempo.

---

### 2.4 Ingresar sueldo o ingresos

**Propósito:** gestionar el dinero que entra. Tiene relación con **Pagos mensuales** (para cubrir gastos) y con **Ahorros** (para el remanente).

**Campos y reglas:**

1. Tipo o nombre del ingreso o sueldo.
2. Monto.
3. La entrada será editable.
4. **Lógica:** al total de todos los ingresos se le resta el total de pagos mensuales.
5. **Lógica:** si hay remanente, se le pregunta al usuario si desea **ahorrarlo** o **no hacer nada** con él.

**Motor de recomendaciones (Kabin):**

- Si el remanente es bajo para ahorrar, el sistema debe:
  - recomendar acciones,
  - identificar categorías de gasto altas,
  - explicar por qué,
  - sugerir mejor gestión para meses futuros,
  - y ofrecer un mensaje de ánimo.
- Si los pagos mensuales superan los ingresos (déficit), el sistema puede señalar **ahorros existentes** o **líneas de crédito** que podrían ayudar a cubrir el hueco.

---

### 2.5 Ahorros

**Propósito:** registrar metas de ahorro concretas. Recibe datos del módulo de **Ingresos** (remanente).

**Campos y reglas:**

1. Tipo o nombre del ahorro (ejemplos: ahorros futuros, viajes, casa, auto, PC, etc.).
2. Monto.
3. Opción de definir un **monto total meta** a alcanzar (no necesariamente mensual, sino global).
4. Barra de progreso del ahorro respecto a la meta.
5. Opción de definir un **monto de ahorro mensual** objetivo.
6. Opciones extra de detalle de la meta: **carga de imágenes** y **enlaces**.

---

## 3. Especificaciones generales del sistema

1. **Acceso:** el usuario puede crear un nombre de usuario y un PIN/contraseña simple de **4 dígitos** para entrar. No se requiere token.
2. **Cuentas:** máximo de **5 perfiles o cuentas** de usuario dentro del sistema.
3. **Asistente:** el sistema incluye un asistente integrado llamado **Kabin**. Kabin se describe como un **agente** (no IA) o guía que da instrucciones paso a paso, mensajes y recomendaciones financieras.

---

## 4. Relaciones entre módulos

| Origen | Destino | Qué ocurre |
| --- | --- | --- |
| Deudas totales | Pagos mensuales | La lista de deudas alimenta el selector de pagos. Un pago reduce el saldo de la deuda. |
| Pagos mensuales | Ingresos | El total de pagos se resta del total de ingresos. |
| Ingresos | Ahorros | Si hay remanente, el usuario puede destinarlo a ahorros. |
| Líneas o créditos | Recomendaciones (Ingresos / Kabin) | Se usan como recurso de respaldo si hay déficit. |
| Pagos mensuales | Deudas totales | Actualizan la barra de progreso y el saldo restante. |

---

## 5. ¿Es viable un apartado en la app actual que lleve a este nuevo sistema?

**Sí, es viable.** La app actual ya usa React Router (`/` emisor y `/stream/:id` receptor), así que se puede agregar una ruta nueva (por ejemplo `/finanzas`) y un botón o menú que navegue hacia el sistema de finanzas.

### Cómo encaja con lo que ya existe

La app de hoy es un **clon P2P de compartición de pantalla** (WebRTC + Socket.io). El sistema de finanzas es otro producto: necesita cuentas, PIN, historial y persistencia. No conviene mezclar esa lógica con el servidor de señalización.

La forma más limpia es:

1. **Misma app frontend, módulos separados.** Un apartado (botón, card o menú) en la pantalla principal que lleve a `/finanzas`. El streaming sigue en `/` y `/stream/:id`.
2. **Datos de finanzas aparte.** En un primer corte, `localStorage` o similar (encaja con máximo 5 cuentas y PIN de 4 dígitos). Más adelante, un backend propio si se necesita historial en la nube.
3. **Kabin como reglas, no como IA.** Mensajes y recomendaciones con lógica if/else sobre ingresos, pagos, deudas, ahorros y créditos. Eso es viable desde el MVP.

### Qué no conviene hacer

- Meter autenticación, deudas o historial en el servidor de Socket.io.
- Acoplar el flujo de video con el de finanzas: son dominios distintos y deben convivir solo a nivel de navegación.

### Conclusión

Un apartado que “te lleve al nuevo sistema” es viable y es el camino correcto si quieres ambas cosas en el mismo producto. La integración es de **navegación y empaquetado**, no de lógica compartida. El streaming y las finanzas pueden vivir juntos en el cliente, cada uno con su ruta y su almacenamiento.
