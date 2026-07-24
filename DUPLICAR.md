# Cómo armar una nueva empresa a partir de esta plantilla

Esta carpeta (`AppCampo`) es la plantilla base. Cada empresa es una copia
independiente: su propia carpeta, su propio repositorio de GitHub, su propia
URL pública y sus propios datos (que además viven solo en el dispositivo de
cada usuario, nunca en el código ni en GitHub).

## 1. Copiar la carpeta

```bash
cp -r AppCampo AppCampo-NombreEmpresa
cd AppCampo-NombreEmpresa
```

## 2. Editar `js/config.js`

```js
const APP_CONFIG = {
  empresaId: "nombreempresa",      // minúsculas, sin espacios ni acentos
  empresaNombre: "Nombre Empresa", // se muestra en el título y el encabezado
  colorPrimario: "#2e5339",        // color principal de la app
  colorSecundario: "#4a7c59",      // usado solo en el ícono
};
```

`empresaId` define el nombre de la base de datos local (`appcampo_<empresaId>`),
así que tiene que ser único y no cambiar una vez que la empresa ya cargó datos
reales (cambiarlo después equivale a vaciar la base).

## 3. Editar `manifest.json`

Cambiar `name`, `short_name`, `theme_color` y `background_color` para que
coincidan con el nombre y los colores del paso anterior.

## 4. Generar los íconos

```bash
python generate_icons.py --iniciales XX --color-fondo "#2e5339" --color-circulo "#4a7c59"
```

Reemplazar `XX` por las iniciales de la empresa y los colores por los del
`config.js`. Esto sobrescribe `icons/icon-192.png` e `icons/icon-512.png`.

## 5. Actualizar `index.html`

El `<meta name="theme-color">` y el `<title>` se sobrescriben automáticamente
desde `config.js` al cargar la app, pero conviene dejarlos ya coherentes en el
HTML por las dudas (se ven antes de que cargue el JS).

## 6. Probar localmente

Agregar una entrada nueva en `.claude/launch.json` (o correr manualmente
`python -m http.server <puerto> --directory AppCampo-NombreEmpresa`) y abrir
`http://localhost:<puerto>` para verificar que el nombre, el color y los
íconos cambiaron antes de publicar.

## 7. Publicar en GitHub Pages

```bash
cd AppCampo-NombreEmpresa
git init
git add .
git commit -m "Primera versión para NombreEmpresa"
gh repo create appcampo-nombreempresa --public --source=. --push
gh api repos/<usuario>/appcampo-nombreempresa/pages -X POST -F build_type=legacy -F "source[branch]=main" -F "source[path]=/"
```

La URL pública queda en `https://<usuario>.github.io/appcampo-nombreempresa/`.
Puede tardar 1-2 minutos en estar disponible la primera vez.

**Importante:** GitHub Pages en el plan gratuito requiere que el repositorio
sea público — el código queda visible para cualquiera, pero los datos de
campo (lotes, cargas, insumos, etc.) de cada empresa nunca se suben a GitHub:
viven únicamente en el navegador de cada dispositivo (IndexedDB), offline.

## 8. Después de publicar

- Compartir la URL con la empresa. Desde el celular, abrirla en Chrome/Safari
  y usar "Agregar a pantalla de inicio" para instalarla como app.
- Cada actualización futura del código de esa empresa: repetir `git add`,
  `git commit`, `git push`. GitHub Pages se actualiza solo en 1-2 minutos.
- Si en el futuro se agrega una sección nueva a la plantilla (`AppCampo`) y
  se quiere llevar a una empresa ya publicada, hay que aplicar los mismos
  cambios de código a su carpeta y volver a hacer push (no hay sincronización
  automática entre plantilla y empresas ya duplicadas).
