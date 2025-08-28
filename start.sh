#!/bin/bash

# Script de démarrage du microservice de notifications ZenBilling
# Ce script configure et démarre automatiquement tous les services nécessaires

set -e

echo "🚀 Démarrage du microservice de notifications ZenBilling..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé. Veuillez installer Docker pour continuer."
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose n'est pas installé. Veuillez installer Docker Compose pour continuer."
    exit 1
fi

# Détecter la commande Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

print_message "Docker Compose détecté: $DOCKER_COMPOSE"

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    print_warning "Fichier .env non trouvé. Création d'un fichier .env à partir de .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_warning "Veuillez éditer le fichier .env avec vos configurations avant de continuer."
        print_message "Variables importantes à configurer:"
        print_message "- BREVO_API_KEY: Votre clé API Brevo"
        print_message "- SUPABASE_URL: URL de votre projet Supabase"
        print_message "- SUPABASE_SERVICE_ROLE_KEY: Clé de service Supabase"
        print_message "- CORS_ORIGIN: Origine CORS autorisée"
        echo
        read -p "Appuyez sur Entrée une fois que vous avez configuré le fichier .env..."
    else
        print_error "Fichier .env.example non trouvé. Veuillez créer un fichier .env manuellement."
        exit 1
    fi
fi

# Fonction pour nettoyer en cas d'interruption
cleanup() {
    print_message "Nettoyage en cours..."
    $DOCKER_COMPOSE down
    exit 1
}

# Capturer les signaux d'interruption
trap cleanup SIGINT SIGTERM

# Arrêter les services existants
print_message "Arrêt des services existants..."
$DOCKER_COMPOSE down --remove-orphans

# Construire les images Docker
print_message "Construction des images Docker..."
$DOCKER_COMPOSE build --no-cache

# Démarrer les services de base de données
print_message "Démarrage des services de base de données..."
$DOCKER_COMPOSE up -d notification-db notification-redis

# Attendre que les services soient prêts
print_message "Attente de la disponibilité des services de base de données..."
sleep 10

# Vérifier si les services sont en cours d'exécution
if ! $DOCKER_COMPOSE ps | grep -q "notification-db.*Up"; then
    print_error "La base de données PostgreSQL n'a pas pu démarrer"
    $DOCKER_COMPOSE logs notification-db
    exit 1
fi

if ! $DOCKER_COMPOSE ps | grep -q "notification-redis.*Up"; then
    print_error "Redis n'a pas pu démarrer"
    $DOCKER_COMPOSE logs notification-redis
    exit 1
fi

print_success "Services de base de données démarrés avec succès"

# Exécuter les migrations Prisma
print_message "Exécution des migrations de base de données..."
$DOCKER_COMPOSE run --rm notification-app npx prisma db push

# Démarrer le microservice principal
print_message "Démarrage du microservice de notifications..."
$DOCKER_COMPOSE up -d notification-app

# Attendre que le service soit prêt
print_message "Vérification de la santé du service..."
sleep 15

# Vérifier si le service est en cours d'exécution
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:3002/health &> /dev/null; then
        print_success "Service de notifications prêt!"
        break
    else
        print_message "Tentative $attempt/$max_attempts - Service en cours de démarrage..."
        sleep 2
        ((attempt++))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    print_error "Le service n'a pas pu démarrer dans les temps impartis"
    print_message "Logs du service:"
    $DOCKER_COMPOSE logs notification-app
    exit 1
fi

# Afficher les informations de connexion
echo
print_success "🎉 Microservice de notifications ZenBilling démarré avec succès!"
echo
print_message "📋 Informations de connexion:"
print_message "  • API du microservice: http://localhost:3002"
print_message "  • Health check: http://localhost:3002/health"
print_message "  • Base de données PostgreSQL: localhost:5433"
print_message "  • Redis: localhost:6380"
echo
print_message "🔧 Services d'administration (optionnels):"
print_message "  • Démarrer PgAdmin: $DOCKER_COMPOSE --profile debug up -d pgadmin"
print_message "  • Démarrer Redis Commander: $DOCKER_COMPOSE --profile debug up -d redis-commander"
print_message "  • PgAdmin sera disponible sur: http://localhost:8083 (admin@notification.local / admin123)"
print_message "  • Redis Commander sera disponible sur: http://localhost:8082"
echo
print_message "📖 Endpoints API disponibles:"
print_message "  • POST /api/notifications/send - Envoyer un email"
print_message "  • POST /api/notifications/invoice/:id/send - Envoyer une facture"
print_message "  • POST /api/notifications/quote/:id/send - Envoyer un devis"
print_message "  • GET /api/notifications/stats - Statistiques"
print_message "  • GET /api/notifications/history - Historique"
echo
print_message "📝 Commandes utiles:"
print_message "  • Voir les logs: $DOCKER_COMPOSE logs -f notification-app"
print_message "  • Arrêter les services: $DOCKER_COMPOSE down"
print_message "  • Redémarrer: $DOCKER_COMPOSE restart notification-app"
echo
print_success "Le microservice est prêt à traiter les notifications par email! 📧" 