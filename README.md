# 📧 Microservice de Notifications ZenBilling

Microservice autonome dédié à la gestion des notifications par email pour l'application ZenBilling, incluant l'envoi de factures et devis par email avec génération automatique de PDFs.

## 🚀 Fonctionnalités

### ✉️ Gestion d'emails
- Envoi d'emails standards et personnalisés
- Support des templates Brevo
- Envoi d'emails en lot (bulk)
- Gestion des pièces jointes
- Envoi d'emails HTML et texte

### 📄 Génération et envoi de documents
- Génération automatique de PDFs de factures
- Génération automatique de PDFs de devis
- Envoi de factures par email avec PDF joint
- Envoi de devis par email avec PDF joint
- Templates HTML personnalisables avec Handlebars

### 📊 Suivi et analytics
- Tracking des statuts d'emails (envoyé, livré, ouvert, cliqué)
- Statistiques détaillées des notifications
- Historique complet avec filtres
- Gestion des webhooks Brevo pour le suivi en temps réel

### 🔐 Sécurité et authentification
- Authentification via Supabase
- Rate limiting
- Validation des données
- Logging avancé avec Pino
- Gestion d'erreurs centralisée

## 🏗️ Architecture

```
notification-microservice/
├── src/
│   ├── controllers/          # Contrôleurs API
│   ├── services/            # Logique métier
│   ├── middlewares/         # Middlewares Express
│   ├── routes/              # Définition des routes
│   ├── interfaces/          # Types TypeScript
│   ├── lib/                 # Configurations (Prisma, Redis, Supabase)
│   ├── utils/               # Utilitaires (logger, erreurs, etc.)
│   ├── templates/           # Templates HTML pour PDFs
│   └── app.ts               # Application Express principale
├── prisma/                  # Schéma et migrations base de données
├── docker-compose.yml       # Orchestration Docker
├── Dockerfile              # Image Docker
└── start.sh                # Script de démarrage automatisé
```

## 🛠️ Installation et Configuration

### Prérequis
- Node.js 18+
- Docker et Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)
- Compte Brevo pour l'envoi d'emails
- Projet Supabase pour l'authentification

### Installation rapide

1. **Cloner et configurer**
```bash
cd notification-microservice
cp .env.example .env
# Éditer le fichier .env avec vos configurations
```

2. **Démarrage automatisé**
```bash
./start.sh
```

Le script `start.sh` configure automatiquement :
- Les services Docker (PostgreSQL, Redis)
- Les migrations de base de données
- Le démarrage du microservice
- Les vérifications de santé

### Configuration manuelle

1. **Variables d'environnement** (`.env`)
```env
# Configuration du serveur
NODE_ENV=development
PORT=3002
LOG_LEVEL=info

# Base de données
DATABASE_URL="postgresql://notification_user:notification_pass@localhost:5433/notification_db"

# Redis
REDIS_URL="redis://localhost:6380"

# Brevo (obligatoire)
BREVO_API_KEY=your_brevo_api_key_here

# Supabase (obligatoire)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# CORS
CORS_ORIGIN=http://localhost:3000
```

2. **Démarrage manuel**
```bash
# Installation des dépendances
npm install

# Démarrage des services Docker
docker-compose up -d notification-db notification-redis

# Migrations de base de données
npx prisma db push

# Développement
npm run dev

# Production
npm run build
npm start
```

## 📖 Documentation API

### Authentification
Toutes les routes (sauf webhooks) requièrent un token Bearer dans le header `Authorization`.

```http
Authorization: Bearer your_supabase_jwt_token
```

### Endpoints disponibles

#### 📧 Envoi d'emails

**POST** `/api/notifications/send`
```json
{
  "to": [{"email": "client@example.com", "name": "Client"}],
  "subject": "Sujet de l'email",
  "htmlContent": "<h1>Contenu HTML</h1>",
  "textContent": "Contenu texte alternatif",
  "sender": {"email": "sender@company.com", "name": "Expéditeur"},
  "cc": [{"email": "cc@example.com"}],
  "bcc": [{"email": "bcc@example.com"}]
}
```

**POST** `/api/notifications/send-bulk`
```json
{
  "emails": [
    {
      "to": [{"email": "client1@example.com"}],
      "subject": "Email 1",
      "htmlContent": "<p>Contenu 1</p>"
    },
    {
      "to": [{"email": "client2@example.com"}],
      "subject": "Email 2", 
      "htmlContent": "<p>Contenu 2</p>"
    }
  ]
}
```

#### 📄 Envoi de documents

**POST** `/api/notifications/invoice/{invoiceId}/send`
```json
{
  "customMessage": "Message personnalisé pour accompagner la facture",
  "includePaymentLink": true,
  "scheduledAt": "2024-01-15T10:00:00Z"
}
```

**POST** `/api/notifications/quote/{quoteId}/send`
```json
{
  "customMessage": "Message personnalisé pour accompagner le devis",
  "scheduledAt": "2024-01-15T10:00:00Z"
}
```

#### 📊 Statistiques et historique

**GET** `/api/notifications/stats?startDate=2024-01-01&endDate=2024-01-31`
```json
{
  "success": true,
  "data": {
    "total": 150,
    "sent": 145,
    "delivered": 140,
    "opened": 89,
    "clicked": 23,
    "bounced": 3,
    "failed": 2,
    "pending": 0
  }
}
```

**GET** `/api/notifications/history?page=1&limit=20&type=INVOICE_SENT&status=sent`
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### 🔧 Santé du service

**GET** `/health`
```json
{
  "status": "OK",
  "service": "notification-microservice",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

## 🐳 Docker et Déploiement

### Services inclus
- **notification-app** : Microservice principal (port 3002)
- **notification-db** : PostgreSQL (port 5433)
- **notification-redis** : Redis (port 6380)
- **pgadmin** : Interface PostgreSQL (port 8083) - optionnel
- **redis-commander** : Interface Redis (port 8082) - optionnel

### Commandes Docker utiles

```bash
# Démarrage complet
docker-compose up -d

# Démarrage avec interfaces d'admin
docker-compose --profile debug up -d

# Voir les logs
docker-compose logs -f notification-app

# Redémarrer le service
docker-compose restart notification-app

# Arrêter tous les services
docker-compose down

# Rebuild des images
docker-compose build --no-cache
```

### Déploiement en production

1. **Configuration des variables d'environnement**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/db
BREVO_API_KEY=your_production_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_key
```

2. **Build et déploiement**
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔄 Intégration avec le backend principal

### Appels depuis le backend monolithique

```typescript
// Service de notification dans le backend principal
class NotificationService {
  private notificationServiceUrl = 'http://notification-microservice:3002';

  async sendInvoiceEmail(invoiceId: string, token: string) {
    const response = await fetch(
      `${this.notificationServiceUrl}/api/notifications/invoice/${invoiceId}/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customMessage: 'Voici votre facture',
          includePaymentLink: true
        })
      }
    );
    return response.json();
  }
}
```

### Webhooks Brevo
Le microservice expose un endpoint pour recevoir les webhooks de Brevo :

**POST** `/api/notifications/webhooks/brevo`

Configure ton compte Brevo pour envoyer les webhooks vers :
`https://your-domain.com/api/notifications/webhooks/brevo`

## 📊 Base de données

### Modèles principaux

#### EmailNotification
```prisma
model EmailNotification {
  notification_id    String             @id @default(uuid())
  user_id           String?
  customer_id       String?
  company_id        String?
  invoice_id        String?
  quote_id          String?
  recipient_email   String
  recipient_name    String?
  sender_email      String
  sender_name       String?
  subject           String
  html_content      String?
  text_content      String?
  type              NotificationType
  status            NotificationStatus @default(pending)
  priority          Int                @default(5)
  scheduled_at      DateTime?
  sent_at           DateTime?
  delivered_at      DateTime?
  opened_at         DateTime?
  clicked_at        DateTime?
  external_id       String?
  variables         String?
  metadata          String?
  error_message     String?
  created_at        DateTime           @default(now())
  updated_at        DateTime           @updatedAt
}
```

## 🚨 Monitoring et Logging

### Logs structurés avec Pino
```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "service": "notification-microservice",
  "requestId": "req-uuid",
  "userId": "user-uuid",
  "msg": "Email envoyé avec succès",
  "data": {
    "notificationId": "notif-uuid",
    "to": ["client@example.com"],
    "messageId": "brevo-message-id"
  }
}
```

### Health checks
- Endpoint `/health` pour les vérifications de santé
- Checks automatiques Docker avec retries
- Monitoring de la connectivité base de données et Redis

## 🔧 Troubleshooting

### Problèmes courants

**1. Erreur de connexion à la base de données**
```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps notification-db

# Voir les logs de la base
docker-compose logs notification-db

# Recréer la base
docker-compose down
docker volume rm notification-microservice_notification_postgres_data
docker-compose up -d notification-db
```

**2. Erreur d'authentification Supabase**
- Vérifier `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`
- S'assurer que la clé de service a les bonnes permissions
- Vérifier que le token JWT est valide

**3. Emails non envoyés**
```bash
# Vérifier la configuration Brevo
curl -X GET "https://api.brevo.com/v3/account" \
  -H "api-key: YOUR_API_KEY"

# Voir les logs du service
docker-compose logs -f notification-app
```

**4. Génération PDF échoue**
```bash
# Vérifier que Chromium est installé dans le container
docker-compose exec notification-app which chromium-browser

# Tester la génération PDF
docker-compose exec notification-app node -e "
const puppeteer = require('puppeteer');
puppeteer.launch({args: ['--no-sandbox']}).then(browser => {
  console.log('Puppeteer OK');
  browser.close();
});
"
```

### Logs utiles
```bash
# Logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs notification-app

# Logs avec horodatage
docker-compose logs -t notification-app
```

## 🧪 Tests et développement

### Développement local
```bash
# Mode développement avec rechargement automatique
npm run dev

# Type checking
npm run ts:check

# Build
npm run build
```

### Tests d'API avec curl

```bash
# Health check
curl http://localhost:3002/health

# Envoyer un email de test (remplacer YOUR_TOKEN)
curl -X POST http://localhost:3002/api/notifications/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "test@example.com", "name": "Test"}],
    "subject": "Test Email",
    "htmlContent": "<h1>Test</h1><p>Ceci est un test</p>"
  }'
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet fait partie de ZenBilling et suit la même licence que le projet principal.

---

## 🆘 Support

Pour obtenir de l'aide :
1. Vérifier cette documentation
2. Consulter les logs : `docker-compose logs -f notification-app`
3. Vérifier la santé du service : `curl http://localhost:3002/health`
4. Ouvrir une issue sur le repository GitHub

**Développé avec ❤️ pour ZenBilling** 