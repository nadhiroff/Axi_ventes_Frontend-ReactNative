-- Axi : tables à ajouter à la base existante (users, otp_codes, auth_tokens).
-- Couvre la connexion par code (SMS / WhatsApp) et Axi Pro, l'espace web des partenaires.
-- Voir docs/API_CONTRACT.md, sections 10 et 11.
--
-- Les tables des étals, produits et commandes (non encore présentes) devront référencer
-- sites, aisles et product_refs : voir les notes en bas de fichier.

USE axi;

-- ---------------------------------------------------------------------------
-- 1. Connexion : canal d'envoi du code et limite par adresse IP
-- ---------------------------------------------------------------------------
ALTER TABLE otp_codes
  ADD COLUMN channel ENUM('sms','whatsapp') NOT NULL DEFAULT 'sms' AFTER code_hash,
  ADD COLUMN ip VARCHAR(45) NULL AFTER channel,
  ADD INDEX idx_ip_created (ip, created_at);

-- ---------------------------------------------------------------------------
-- 2. Organisations partenaires (ANaGeM, annonceurs, IMF, acheteurs d'études)
-- ---------------------------------------------------------------------------
CREATE TABLE organizations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('anagem','advertiser','mfi','research') NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Un compte 'pro' appartient à une organisation ; elle décide des onglets visibles.
ALTER TABLE users
  ADD COLUMN organization_id INT UNSIGNED NULL AFTER role,
  ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 3. Sites du marché et allées (identifiants lisibles, repris tels quels dans l'API)
-- ---------------------------------------------------------------------------
CREATE TABLE sites (
  id VARCHAR(30) PRIMARY KEY,               -- ex. 'yoyo'
  name VARCHAR(100) NOT NULL,               -- ex. 'Tokpa Yôyô'
  city VARCHAR(100) NOT NULL DEFAULT 'Cotonou',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE aisles (
  id VARCHAR(30) PRIMARY KEY,               -- ex. 'tissus'
  name VARCHAR(100) NOT NULL,               -- ex. 'Tissus et pagnes'
  icon ENUM('fabric','grain','beauty','hardware','parts','jewelry','electronics','other') NOT NULL DEFAULT 'other',
  sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 4. Référentiel produits : indispensable aux prix médians.
--    "Riz 25kg" et "Sac riz 25 kg" doivent pointer vers la même référence.
-- ---------------------------------------------------------------------------
CREATE TABLE product_refs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  aisle_id VARCHAR(30) NOT NULL,
  name VARCHAR(150) NOT NULL,               -- ex. 'Riz, sac de 25 kg'
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_ref_name (name),
  FOREIGN KEY (aisle_id) REFERENCES aisles(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 5. Prix médians par produit, site et jour.
--    Calculés chaque nuit par une tâche planifiée PHP (MySQL n'a pas de fonction MEDIAN) :
--    pour chaque (référence, site), trier les prix des étals et prendre la valeur du milieu.
--    L'API n'affiche une ligne que si sample_size >= 5.
-- ---------------------------------------------------------------------------
CREATE TABLE price_stats_daily (
  product_ref_id INT UNSIGNED NOT NULL,
  site_id VARCHAR(30) NOT NULL,
  day DATE NOT NULL,
  median_price INT UNSIGNED NOT NULL,       -- FCFA
  sample_size SMALLINT UNSIGNED NOT NULL,   -- nombre d'étals pris en compte
  PRIMARY KEY (product_ref_id, site_id, day),
  INDEX idx_site_day (site_id, day),
  FOREIGN KEY (product_ref_id) REFERENCES product_refs(id) ON DELETE CASCADE,
  FOREIGN KEY (site_id) REFERENCES sites(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 6. Campagnes (annonceurs). Le ciblage reste chez Axi : l'annonceur ne reçoit
--    jamais de liste de commerçants ni de clients.
-- ---------------------------------------------------------------------------
CREATE TABLE campaigns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  audience_type ENUM('merchants','clients') NOT NULL,
  aisle_id VARCHAR(30) NULL,                -- NULL : toutes les allées
  site_id VARCHAR(30) NULL,                 -- NULL : tous les sites
  format ENUM('supplier_offer','sponsored_home') NOT NULL,
  title VARCHAR(150) NULL,
  body VARCHAR(500) NULL,
  budget INT UNSIGNED NOT NULL,             -- FCFA
  status ENUM('pending_review','active','ended','rejected') NOT NULL DEFAULT 'pending_review',
  reviewed_by INT UNSIGNED NULL,            -- membre de l'équipe Axi qui a validé
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  impressions INT UNSIGNED NOT NULL DEFAULT 0,
  clicks INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campaign_status (status, starts_at),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (aisle_id) REFERENCES aisles(id),
  FOREIGN KEY (site_id) REFERENCES sites(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 7. Accord explicite du commerçant pour partager son historique avec une IMF,
--    et crédits accordés. Sans accord actif (revoked_at NULL), aucun dossier n'est visible.
-- ---------------------------------------------------------------------------
CREATE TABLE data_sharing_consents (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  merchant_user_id INT UNSIGNED NOT NULL,
  organization_id INT UNSIGNED NOT NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at DATETIME NULL,
  INDEX idx_consent_active (organization_id, revoked_at),
  FOREIGN KEY (merchant_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
) ENGINE=InnoDB;

CREATE TABLE credits (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  merchant_user_id INT UNSIGNED NOT NULL,
  organization_id INT UNSIGNED NOT NULL,
  amount INT UNSIGNED NULL,                 -- FCFA, connu une fois accordé
  status ENUM('new','in_review','granted','declined','repaid') NOT NULL DEFAULT 'new',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at DATETIME NULL,
  INDEX idx_credit_org_status (organization_id, status),
  FOREIGN KEY (merchant_user_id) REFERENCES users(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 8. Demandes de visite d'un agent (bouton "Demander la visite d'un agent").
--    C'est l'agent qui, après vérification sur place, passe users.role à 'merchant'.
-- ---------------------------------------------------------------------------
CREATE TABLE agent_visit_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('new','scheduled','done','cancelled') NOT NULL DEFAULT 'new',
  assigned_agent_id INT UNSIGNED NULL,
  scheduled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visit_status (status, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_agent_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Données de départ
-- ---------------------------------------------------------------------------
INSERT INTO sites (id, name, sort_order) VALUES
  ('yoyo', 'Tokpa Yôyô', 1),
  ('daho', 'Tokpa Dahô', 2),
  ('ouando', 'Ouando', 3),
  ('st-michel', 'Saint-Michel', 4);

INSERT INTO aisles (id, name, icon, sort_order) VALUES
  ('tissus', 'Tissus et pagnes', 'fabric', 1),
  ('vivriers', 'Vivriers en gros', 'grain', 2),
  ('cosmetiques', 'Cosmétiques', 'beauty', 3),
  ('quincaillerie', 'Quincaillerie', 'hardware', 4),
  ('pieces', 'Pièces détachées', 'parts', 5),
  ('bijoux', 'Bijoux et sacs', 'jewelry', 6),
  ('electronique', 'Électronique', 'electronics', 7);

-- ---------------------------------------------------------------------------
-- Notes pour les tables à venir (étals, produits, commandes)
-- ---------------------------------------------------------------------------
-- stalls   : user_id -> users(id) (le commerçant), site_id -> sites(id),
--            aisle_id -> aisles(id), has_physical_place BOOLEAN (pour "sans place"),
--            verified_at / verified_by (agent), moved_at.
-- products : stall_id -> stalls(id), product_ref_id -> product_refs(id) NULL
--            (rattachement au référentiel, nécessaire aux prix médians).
