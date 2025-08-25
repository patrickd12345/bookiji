---
title: Connexion Stripe et empreinte de 1$
locale: fr
section: policy
---

# Connexion Stripe et Empreinte de 1$

Ce document explique la logique d'empreinte de 1$ avec Stripe, la gestion de l'idempotency et les webhooks multi-confirmations.

## Pourquoi une empreinte de 1$ ?

Bookiji utilise une empreinte de 1$ (et non une charge) pour plusieurs raisons importantes :

### 1. Vérification de la méthode de paiement
- Confirme que la carte est valide et active
- Vérifie que le compte a des fonds suffisants
- Valide les informations de facturation

### 2. Sécurité et prévention des fraudes
- Détecte les cartes volées ou frauduleuses
- Réduit les tentatives de réservation avec de fausses cartes
- Protège nos fournisseurs contre les réservations non honorées

### 3. Conformité réglementaire
- Respecte les normes PCI DSS
- Suit les meilleures pratiques de l'industrie
- Maintient la conformité avec les régulateurs financiers

## Comment fonctionne l'empreinte

### Processus d'autorisation
1. **Demande d'autorisation** : Stripe demande une autorisation de 1$ à la banque
2. **Vérification bancaire** : La banque vérifie la validité de la carte
3. **Réservation des fonds** : 1$ est temporairement réservé sur le compte
4. **Confirmation** : L'autorisation est confirmée sans débit réel

### Durée de l'empreinte
- **Délai standard** : 1-3 jours ouvrables
- **Délai maximum** : 7 jours (selon la banque)
- **Libération automatique** : Aucune action requise de votre part

## Gestion de l'idempotency

### Protection contre les doubles charges
- Chaque demande d'autorisation reçoit un ID unique
- Les tentatives multiples avec le même ID sont ignorées
- Garantit qu'une seule empreinte est créée par réservation

### Récupération en cas d'échec
- Si l'autorisation échoue, une nouvelle tentative est autorisée
- Les échecs temporaires (réseau, banque) sont automatiquement retentés
- Aucun double débit possible

## Webhooks et confirmations

### Notifications en temps réel
- Stripe notifie Bookiji de chaque changement de statut
- Les confirmations sont traitées immédiatement
- Les échecs déclenchent des notifications automatiques

### Gestion des cas d'erreur
- **Autorisation refusée** : Notification immédiate à l'utilisateur
- **Autorisation expirée** : Demande de nouvelle méthode de paiement
- **Problèmes techniques** : Retry automatique avec backoff exponentiel

## Impact sur votre compte

### Aucun coût réel
- L'empreinte de 1$ n'est jamais débitée
- Aucun intérêt ou frais n'est appliqué
- Votre solde bancaire reste inchangé

### Affichage bancaire
- Peut apparaître comme "autorisation en attente"
- Certaines banques l'affichent comme "charge en attente"
- Disparaît automatiquement sans action de votre part

## Support et assistance

### En cas de problème
- **Support technique** : Notre équipe est disponible 24/7
- **Documentation** : Guides détaillés dans notre centre d'aide
- **Chat AI** : Réponses instantanées à vos questions

### Contact
- **Email** : support@bookiji.com
- **Chat** : Disponible sur bookiji.com
- **Téléphone** : +1 (555) 123-4567

## Questions fréquentes

**Q : Pourquoi 1$ et pas 0,50$ ?**
R : 1$ est le montant minimum requis par la plupart des banques pour une autorisation valide.

**Q : Combien de temps l'empreinte reste-t-elle ?**
R : Généralement 1-3 jours ouvrables, selon votre banque.

**Q : Puis-je annuler l'empreinte ?**
R : Non, c'est un processus automatique géré par votre banque.

**Q : Que se passe-t-il si ma carte expire ?**
R : L'empreinte sera automatiquement libérée, mais vous devrez ajouter une nouvelle carte pour continuer à utiliser Bookiji.
