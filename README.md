# Agenda Colaborativa - Node + React + MySQL

Plataforma de agenda colaborativa con backend en Node.js/Express, frontend en React, y MySQL como base de datos. Funciona en desktop y mobile.

## Características

- **Autenticación**: Login/registro con JWT y contraseñas bcrypt
- **Gestión de eventos**: Crear eventos, bloquear horarios
- **Invitaciones anónimas**: Invitar colaboradores sin revelar detalles (opcional)
- **Detección de conflictos**: Impide agendar reuniones en horarios ocupados
- **Panel de admin**: Gestionar usuarios y roles
- **Responsive**: Funciona en PC, tablet y mobile

## Estructura del proyecto

```
Agenda/
├── backend/              # Express API
│   ├── index.js         # Servidor principal
│   ├── db.js            # Conexión MySQL
│   ├── schema.sql       # Esquema de base de datos
│   ├── seed.js          # Script para crear usuario admin
│   ├── package.json
│   └── .env.example
├── frontend/            # React + Vite
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Calendar.jsx
│   │   │   ├── Invites.jsx
│   │   │   └── Admin.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml   # Para correr con Docker
└── README.md
```

## Instalación local

### Requisitos
- Node.js 18+
- MySQL 8.0+

### Backend

```bash
cd backend
npm install
```

Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` con tus variables:
```
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=agenda_db
JWT_SECRET=tu_secret_seguro
PORT=4000
```

Crear esquema en MySQL:
```bash
mysql -u tu_usuario -p tu_contraseña agenda_db < schema.sql
```

Crear usuario admin:
```bash
npm run seed
```

Iniciar backend:
```bash
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend estará disponible en `http://localhost:5173` (Vite dev server)

## Con Docker

Desde la raíz del proyecto:

```bash
docker-compose up
```

- Frontend: http://localhost:3002
- Backend API: http://localhost:4001
- MySQL: localhost:3306

El script de seed se ejecutará automáticamente.

## Credenciales de demostración

```
Email: admin@example.com
Contraseña: admin123
Rol: admin
```

## API Endpoints

### Autenticación
- `POST /auth/register` - Registrar usuario
- `POST /auth/login` - Iniciar sesión

### Eventos
- `GET /events` - Listar eventos del usuario
- `POST /events` - Crear evento
  - Si se agendan participantes, detecta conflictos automáticamente

### Invitaciones
- `GET /invites` - Ver invitaciones del usuario
- `POST /events/:id/invite` - Invitar usuario a evento
  - Parámetro `anonymous: true` oculta detalles del evento
- `POST /invites/:id/response` - Responder invitación (aceptar/rechazar)

### Admin (requiere rol admin)
- `GET /admin/users` - Listar usuarios
- `PUT /admin/users/:id/role` - Cambiar rol de usuario

## Schema de base de datos

- **users**: email, password (bcrypt), role (user/admin), created_at
- **events**: title, description, start_time, end_time, owner_id, anonymous flag
- **event_participants**: event_id, user_id, role
- **invites**: event_id, from_user, to_user, anonymous, status (pending/accepted/rejected)

## Seguridad

- Contraseñas hasheadas con bcrypt
- Tokens JWT con expiración 12h
- Validación de permisos en endpoints
- CORS habilitado para desarrollo
- Detección de conflictos de horarios

## Próximas mejoras

- Notificaciones en tiempo real (WebSockets)
- Video conferencias integradas
- Importar/exportar eventos (ICS)
- Sincronización con Google Calendar
- Móvil nativa (React Native)

## Licencia

MIT
