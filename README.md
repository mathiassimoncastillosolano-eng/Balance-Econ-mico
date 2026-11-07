# MONIQ — Inteligencia financiera personal

Reconstrucción web (React + TypeScript) de la antigua aplicación JavaFX *appEconomy*.
**Solo frontend**: sin backend ni base de datos. Todo funciona con datos mock, servicios simulados y `localStorage`.

## Ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build
npm run lint
```

## Credenciales de demostración

| Correo | Contraseña |
|---|---|
| `demo@economicbalance.pe` | `Demo2026` |

También puedes crear una cuenta nueva (empieza con categorías base y sin movimientos).
El botón **Usar** de la pantalla de login rellena las credenciales demo.

## Modelo de negocio (heredado de appEconomy)

- **Categoría** (`CategoriaMovimiento`): clasifica ingresos o egresos (color, icono, activo/inactivo).
- **Concepto** (antes «Plantilla», `Movimiento`): elemento específico dentro de una categoría (Alquiler, Sueldo…), con importe habitual.
- **Movimiento** (`PagoMovimiento`): operación registrada (concepto + importe + fecha). Editable, eliminable (borrado lógico) y restaurable.

## Módulos

Resumen · Ingresos · Egresos · Historial · Categorías y conceptos · Presupuestos · Reportes (mensual/anual, CSV) · Configuración.

## Arquitectura

```
src/
├── app/            config, bootstrap (loader), providers, router, layouts
├── components/     ui (primitivas), common, navigation, charts, feedback, brand
├── features/       auth, dashboard, flows, movimientos, categorias, presupuestos, reportes, configuracion
├── hooks/  stores/  types/  utils/  styles/
└── services/       types.ts (contratos) + mock/ (implementaciones localStorage)
```

- `services/index.ts` es el único punto de inyección: para un backend real se reemplazan las implementaciones mock por clientes HTTP que respeten `services/types.ts`.
- Loader inicial: `app/config.ts → minLoaderMs = 3000`; `app/bootstrap/appInitializer.ts` es donde irá la inicialización real (sesión, perfil, datos). `BootGate` espera **ambas** cosas.

## Limitaciones actuales

- Datos solo en el navegador (localStorage); sin sincronización entre dispositivos.
- Autenticación y recuperación de contraseña simuladas (el código se muestra en pantalla; hash no seguro).
- La moneda cambia símbolo/formato, no convierte importes.
- Las fechas de movimientos no pueden ser futuras.
