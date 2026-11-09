# Design System — Finlab Fintech Theme

## 1. Paleta de Colores y Tokens

Inspirado en la composición y contraste de Finlab:

```css
:root {
  /* Fondos principales */
  --bg-page: #F3F5F7;          /* Fondo neutral suave */
  --bg-card: #FFFFFF;          /* Tarjetas y módulos blancos */
  --bg-header: #1B2636;        /* Azul marino oscuro para navegación y welcome area */
  --bg-header-surface: #243245;/* Superficie elevada en cabecera */

  /* Colores de Marca y Acento */
  --primary-teal: #2AB49E;     /* Teal primario para CTAs y estado positivo */
  --primary-teal-hover: #229986;
  --primary-teal-subtle: #E8F8F5;

  /* Texto y Jerarquía */
  --text-main: #182230;        /* Texto principal en tarjetas */
  --text-muted: #667085;       /* Texto secundario y etiquetas */
  --text-inverse: #FFFFFF;     /* Texto blanco en cabecera marina */
  --text-inverse-muted: #94A3B8;

  /* Indicadores Financieros */
  --finance-positive: #10B981; /* Ingresos y variaciones positivas */
  --finance-negative: #F04438; /* Gastos y alertas */
  --finance-neutral: #64748B;  /* Transferencias */

  /* Bordes y Sombras */
  --border-subtle: #EAECF0;
  --card-radius: 18px;
  --card-shadow: 0px 1px 3px rgba(16, 24, 40, 0.05), 0px 1px 2px rgba(16, 24, 40, 0.03);
  --header-shadow: 0px 4px 20px rgba(0, 0, 0, 0.08);
}
```

## 2. Tipografía y Espaciado

- **Fuente:** Inter o Geist Sans con números tabulares (`font-feature-settings: 'tnum' on, 'lnum' on`) para alinear importes monetarios.
- **Escala de Espaciado:** Múltiplos de 4px y 8px (p-4 = 16px, p-6 = 24px, gap-6 = 24px).
- **Tarjetas:** Radio de borde consistente de 16px a 20px (predeterminado `18px`), padding interno de 20px a 24px.

## 3. Disposición Responsiva

- **Desktop (1440 × 900):**
  - Cabecera marina unificada con barra de navegación superior, selector de cuentas, saludo personalizado, badge de insight IA y botones de acción rápida.
  - Cuadrícula de 3 columnas balanceada:
    - Columna izquierda/central: Balance total, flujo de caja mensual, gráfico de ingresos vs gastos, gastos por categoría.
    - Columna derecha: Actividad reciente (transacciones), próximas suscripciones a pagar, resumen de presupuestos.
- **Mobile (390 × 844 y 360 × 800):**
  - Navegación compacta con drawer/menú hamburguesa y barra inferior de acceso rápido.
  - Tarjetas apiladas verticalmente con prioridad: Saldo actual -> Flujo del mes -> Últimas transacciones -> Próximos pagos.
  - Gráficos adaptados sin desbordamiento horizontal.
