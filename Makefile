# 🌍 Projet LPO Balades - Commandes Utiles

# === 📦 Installation ===

.PHONY: install
install:
	@echo "📦 Installation des dépendances du monorepo..."
	npm install

.PHONY: clean
clean:
	@echo "🧹 Nettoyage des dossiers node_modules..."
	rm -rf node_modules apps/backend/node_modules apps/backoffice/node_modules
	@echo "✨ Propre ! N'oublie pas de refaire un 'make install'"

# === 🚀 Démarrage (Développement) ===

.PHONY: dev
dev:
	@echo "🚀 Démarrage du Backend ET du Backoffice en parallèle..."
	npm run dev

.PHONY: dev-back
dev-back:
	@echo "⚙️  Démarrage du Backend uniquement..."
	npm run dev --workspace=backend

.PHONY: dev-front
dev-front:
	@echo "🖥️  Démarrage du Backoffice (Next.js) uniquement..."
	npm run dev --workspace=backoffice

# === 🧪 Tests ===

.PHONY: test
test:
	@echo "🧪 Lancement de tous les tests unitaires du backend..."
	npm run test --workspace=backend

.PHONY: test-cov
test-cov:
	@echo "📊 Lancement des tests avec rapport de couverture (Coverage)..."
	npm run test:cov --workspace=backend

.PHONY: test-e2e
test-e2e:
	@echo "🤖 Lancement des tests End-to-End (E2E) via test-api.js..."
	node apps/backend/test-api.js

# === 🗄️  Base de données (Prisma) ===

.PHONY: db-push
db-push:
	@echo "⬆️  Synchronisation du schéma Prisma avec la base de données..."
	cd apps/backend && npx prisma db push

.PHONY: db-generate
db-generate:
	@echo "🔨 Génération du client Prisma..."
	cd apps/backend && npx prisma generate

.PHONY: db-seed
db-seed:
	@echo "🌱 creation du compte super admin "
	cd apps/backend && npx prisma db seed

.PHONY: db-studio
db-studio:
	@echo "🗂️  Ouverture de Prisma Studio (Interface graphique de la DB)..."
	cd apps/backend && npx prisma studio

# === 💡 Aide ===

.PHONY: help
help:
	@echo "*** Liste des commandes disponibles : ***"
	@echo "-----------------------------------------"
	@echo "- Installation :"
	@echo "  make install      : Installe toutes les dépendances (npm install)"
	@echo "  make clean        : Supprime tous les node_modules"
	@echo ""
	@echo "- Démarrage :"
	@echo "  make dev          : Lance Backend + Backoffice"
	@echo "  make dev-back     : Lance le Backend uniquement"
	@echo "  make dev-front    : Lance le Backoffice uniquement"
	@echo ""
	@echo "- Tests :"
	@echo "  make test         : Lance les tests unitaires (Jest)"
	@echo "  make test-cov     : Lance les tests unitaires avec la couverture de code"
	@echo "  make test-e2e     : Lance le script de tests E2E"
	@echo ""
	@echo "- Base de données :"
	@echo "  make db-push      : Pousse le schéma vers la DB (Prisma db push)"
	@echo "  make db-generate  : Regénère le client Prisma"
	@echo "  make db-seed      : Lance le script de seed pour populer la DB"
	@echo "  make db-studio    : Ouvre Prisma Studio"
