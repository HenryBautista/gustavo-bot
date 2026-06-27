# gustavo-bot

Bot de Discord personal con reproducción de música desde YouTube, Spotify y Navidrome, más saludos por voz cuando los usuarios entran a un canal.

## Características

- **Música** — reproduce desde YouTube (búsqueda o URL), URLs de Spotify, y tu librería privada en Navidrome
- **Cola** — encola canciones, salta, pausa, reanuda y para
- **Saludos** — anuncia por voz con texto personalizado cuando usuarios conocidos entran al canal
- **Calidad** — streaming de alta calidad vía yt-dlp con descifrado de URLs protegidas de YouTube
- **Prefijo** — todos los comandos usan `g!` (configurable)

---

## Requisitos previos

### 1. Discord Developer Portal

1. Entra a [discord.com/developers/applications](https://discord.com/developers/applications) y abre tu aplicación
2. Ve a **Bot → Privileged Gateway Intents** y activa:
   - **Server Members Intent**
   - **Message Content Intent** ← obligatorio para los comandos `g!`
3. Guarda los cambios

### 2. Node.js

Node.js 20 o superior. Verifica con:
```bash
node --version
```

### 3. yt-dlp

Necesario para reproducir YouTube. Instala con pip:
```bash
pip install yt-dlp
```

**Windows:** Si `yt-dlp` no está en el PATH después de instalarlo, busca la ruta del ejecutable con `pip show -f yt-dlp` y ponla en `YTDLP_PATH` dentro de `.env`.

**Linux/Docker:** `pip3 install yt-dlp` y ya queda en el PATH automáticamente.

### 4. Navidrome (opcional)

Si quieres usar `g!play nav:`, crea un usuario dedicado para el bot en el panel de administración de Navidrome con permisos de solo lectura.

---

## Instalación local

```bash
git clone <repo-url>
cd gustavo-bot
npm install
```

Copia el archivo de ejemplo y rellena los valores:
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales (ver sección [Variables de entorno](#variables-de-entorno)).

Arranca el bot:
```bash
node app.js
```

---

## Deploy con Docker

El proyecto incluye `Dockerfile` y `docker-compose.yml`. El Dockerfile instala automáticamente yt-dlp, ffmpeg y todas las dependencias.

### Primera vez

```bash
# En el servidor
git clone <repo-url>
cd gustavo-bot
cp .env.example .env
nano .env   # rellena las credenciales
docker compose up -d --build
```

### Actualizar tras un push

```bash
git pull
docker compose up -d --build
```

Los logs se rotan automáticamente (10 MB × 3 archivos según `docker-compose.yml`).

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DISCORD_TOKEN` | Sí | Token del bot (Bot → Token en el portal) |
| `APP_ID` | No | ID de la aplicación Discord |
| `PUBLIC_KEY` | No | Clave pública de la aplicación |
| `PREFIX` | No | Prefijo de comandos. Default: `g!` |
| `NAVIDROME_URL` | Para Navidrome | URL base de tu servidor Navidrome, ej. `http://192.168.0.130:4533` |
| `NAVIDROME_USER` | Para Navidrome | Usuario del bot en Navidrome |
| `NAVIDROME_PASS` | Para Navidrome | Contraseña del usuario de Navidrome |
| `YTDLP_PATH` | Solo Windows | Ruta al ejecutable `yt-dlp.exe` si no está en el PATH |

---

## Comandos

| Comando | Alias | Descripción |
|---|---|---|
| `g!play <búsqueda o URL>` | `g!p` | Reproduce desde YouTube (búsqueda o URL directa) |
| `g!play <URL de Spotify>` | `g!p` | Resuelve la canción de Spotify y la reproduce desde YouTube |
| `g!play nav:<búsqueda>` | `g!p nav:` | Busca y reproduce desde tu librería de Navidrome |
| `g!skip` | `g!s` | Salta la canción actual |
| `g!stop` | — | Para la reproducción, limpia la cola y desconecta el bot |
| `g!pause` | — | Pausa la reproducción |
| `g!resume` | `g!r` | Reanuda la reproducción pausada |
| `g!queue` | `g!q` | Muestra la cola actual (hasta 10 canciones) |
| `g!np` | `g!nowplaying` | Muestra la canción que suena ahora |
| `g!help` | `g!h` | Muestra la lista de comandos |

### Ejemplos

```
g!play never gonna give you up
g!play https://www.youtube.com/watch?v=dQw4w9WgXcQ
g!play https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8
g!play nav:miles davis
g!queue
g!skip
```

---

## Saludos por voz

Cuando un usuario conocido entra al canal de voz objetivo, el bot se une y reproduce un saludo en TTS (Google TTS).

Para agregar o modificar usuarios, edita el objeto `users` en `src/config.js`:

```js
users: {
  'DISCORD_USER_ID': {
    greeting: 'Texto que dice el bot en voz',   // obligatorio
    name: 'Nombre para logs',                    // opcional
    lang: 'es',                                  // opcional, default 'es' (BCP-47)
  },
}
```

Para obtener el ID de un usuario en Discord: activa el Modo desarrollador en Ajustes → Avanzado, luego haz clic derecho sobre el usuario → Copiar ID.

El canal objetivo se configura con `TARGET_VOICE_CHANNEL_ID` en `src/config.js`. Si hay música sonando cuando alguien entra, el saludo se omite para no interrumpir.

---

## Arquitectura

```
app.js                       ← entrada: carga .env, inicia el bot
src/
  bot.js                     ← cliente Discord + registro de eventos
  config.js                  ← PREFIX, IDs de canales, mapa de usuarios
  events/
    ready.js                 ← log de inicio
    voiceStateUpdate.js      ← sistema de saludos
    messageCreate.js         ← parser de prefijo g! y dispatcher
  commands/
    index.js                 ← registro de comandos (nombre + alias → módulo)
    play.js  skip.js  stop.js  pause.js  resume.js  queue.js  nowplaying.js  help.js
  music/
    GuildMusicManager.js     ← cola + AudioPlayer + VoiceConnection por servidor
    sources/
      youtube.js             ← búsqueda y metadata vía yt-dlp
      spotify.js             ← resuelve URL de Spotify → busca en YouTube
      navidrome.js           ← API Subsonic: auth por token MD5 + búsqueda + stream
      ytdlp.js               ← streaming de audio vía yt-dlp
```

### Flujo de música

```
g!play <input>
  └─ play.js detecta fuente
       ├─ nav:      → navidrome.search()  → track con navSongId
       ├─ spotify   → spotify.resolveSpotifyUrl() → youtube.search()
       ├─ URL YT    → youtube.getInfo()
       └─ texto     → youtube.search()
           └─ GuildMusicManager.add(track, voiceChannel)
                └─ _buildResource()
                     ├─ navidrome → fetch(buildStreamUrl(navSongId))
                     └─ youtube   → ytdlp.stream(url)  [vía yt-dlp]
```

### Autenticación con Navidrome

Usa el método token del Subsonic API (v1.13+): la contraseña nunca viaja en texto plano. Para cada request se genera un salt aleatorio y se envía `MD5(password + salt)`. Implementado en `src/music/sources/navidrome.js`.

### Por qué yt-dlp y no play-dl o ytdl-core

`play-dl` y `ytdl-core` fallan en videos con URLs cifradas (videos oficiales, Vevo, etc.) porque no pueden ejecutar el JavaScript obfuscado de YouTube. `yt-dlp` resuelve esto usando Node.js como runtime JS (flag `--js-runtimes node:<path>`), que se pasa automáticamente con `process.execPath`.

---

## Estructura de dependencias

| Paquete | Uso |
|---|---|
| `discord.js` | Cliente de Discord |
| `@discordjs/voice` | Conexiones de voz y AudioPlayer |
| `@discordjs/opus` | Codec de audio Opus |
| `ffmpeg-static` | Binario de FFmpeg empaquetado |
| `google-tts-api` | TTS para los saludos |
| `play-dl` | Búsqueda en YouTube (solo metadata, no streaming) |
| `dotenv` | Variables de entorno |
| `yt-dlp` *(sistema)* | Streaming de YouTube — instalado vía pip, no npm |
