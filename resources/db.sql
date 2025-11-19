-- ===== SCHEMA POSTGRESQL MÍNIMO - SOLO TABLAS =====

-- Tipos ENUM personalizados
CREATE TYPE matchstatus AS ENUM ('Pending', 'Accepted', 'EmailNotFound');
CREATE TYPE projectstatus AS ENUM ('Active', 'Finalized');
CREATE TYPE transactionstatus AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE approvalstatus AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE splittype AS ENUM ('Equal', 'Custom', 'Percentage');

-- Tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    datecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE passwordresettokens (
    id SERIAL PRIMARY KEY,
    userid INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiresat TIMESTAMP NOT NULL,
    isused BOOLEAN DEFAULT FALSE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    usedat TIMESTAMP NULL,
    ipaddress VARCHAR(45) NULL,
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_tokens_token ON passwordresettokens(token);
CREATE INDEX idx_password_reset_tokens_userid_active ON passwordresettokens(userid, expiresat, isused);
CREATE INDEX idx_password_reset_tokens_cleanup ON passwordresettokens(expiresat, isused);

-- Tokens de verificación de email
CREATE TABLE emailverificationtokens (
    id SERIAL PRIMARY KEY,
    userid INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expiresat TIMESTAMP NOT NULL,
    isverified BOOLEAN DEFAULT FALSE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verifiedat TIMESTAMP NULL,
    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_verification_tokens_token ON emailverificationtokens(token);
CREATE INDEX idx_email_verification_tokens_userid ON emailverificationtokens(userid, expiresat);
CREATE INDEX idx_email_verification_tokens_cleanup ON emailverificationtokens(expiresat, isverified);

-- Actualizar tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS isemailverified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emailverifiedat TIMESTAMP NULL;

-- Eliminar columna 'code' antigua (ejecutar después de migrar datos si es necesario)
ALTER TABLE users DROP COLUMN IF EXISTS code;

-- Colaboradores - email NULL = interno, email valor = externo
CREATE TABLE collaborators (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(150), -- NULL = colaborador INTERNO, valor = colaborador EXTERNO
    userid INT NOT NULL,
    isactive BOOLEAN DEFAULT TRUE, --AGREGAR para soft delete
    datecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id)
);

-- Índices para colaboradores
CREATE INDEX idx_collaborators_userid ON collaborators(userid);
CREATE INDEX idx_collaborators_email ON collaborators(email);
CREATE INDEX idx_collaborators_useremail ON collaborators(userid, email);
CREATE INDEX idx_collaborators_usertype ON collaborators(userid, email);

-- Solicitudes de matching entre colaboradores
CREATE TABLE collaboratormatchrequests (
    id SERIAL PRIMARY KEY,
    requesteruserid INT NOT NULL,
    requestercollaboratorid INT NOT NULL,
    targetuserid INT NULL, -- ✅ NULL permitido cuando email no existe
    targetcollaboratoremail VARCHAR(150) NOT NULL,
    status matchstatus DEFAULT 'Pending',
    requesteddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responsedate TIMESTAMP,
    FOREIGN KEY (requesteruserid) REFERENCES users(id),
    FOREIGN KEY (requestercollaboratorid) REFERENCES collaborators(id),
    FOREIGN KEY (targetuserid) REFERENCES users(id),
    CONSTRAINT uniquerequest UNIQUE (requestercollaboratorid, targetcollaboratoremail)
);

-- Índices para match requests
CREATE INDEX idx_matchrequests_targetstatus ON collaboratormatchrequests(targetuserid, status);
CREATE INDEX idx_matchrequests_requesterstatus ON collaboratormatchrequests(requesteruserid, status);
CREATE INDEX idx_matchrequests_email ON collaboratormatchrequests(targetcollaboratoremail);

-- Matches aceptados entre colaboradores externos (SIN campo email)
CREATE TABLE collaboratormatches (
    id SERIAL PRIMARY KEY,
    collaborator1id INT NOT NULL,
    collaborator2id INT NOT NULL,
    user1id INT NOT NULL,
    user2id INT NOT NULL,
    datecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collaborator1id) REFERENCES collaborators(id),
    FOREIGN KEY (collaborator2id) REFERENCES collaborators(id),
    FOREIGN KEY (user1id) REFERENCES users(id),
    FOREIGN KEY (user2id) REFERENCES users(id),
    CONSTRAINT uniquematch UNIQUE (collaborator1id, collaborator2id)
);

-- Índices para matches
CREATE INDEX idx_matches_user1 ON collaboratormatches(user1id);
CREATE INDEX idx_matches_user2 ON collaboratormatches(user2id);
CREATE INDEX idx_matches_collaborators ON collaboratormatches(collaborator1id, collaborator2id);

-- Tabla de proyectos
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    userid INT NOT NULL,
    status projectstatus DEFAULT 'Active',
    datecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalizeddate TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id)
);

-- Índices para proyectos
CREATE INDEX idx_projects_createdbyuser ON projects(userid);
CREATE INDEX idx_projects_status ON projects(status);

-- Miembros del proyecto
CREATE TABLE projectmembers (
    id SERIAL PRIMARY KEY,
    projectid INT NOT NULL,
    userid INT NOT NULL,
    collaboratorid INT NOT NULL,
    email VARCHAR(150), -- NULL si colaborador interno, valor si externo
    joineddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projectid) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (userid) REFERENCES users(id),
    FOREIGN KEY (collaboratorid) REFERENCES collaborators(id),
    CONSTRAINT uniqueprojectcollaborator UNIQUE (projectid, collaboratorid)
);

-- Índices para project members
CREATE INDEX idx_projectmembers_projectuser ON projectmembers(projectid, userid);
CREATE INDEX idx_projectmembers_userprojects ON projectmembers(userid, projectid);
CREATE INDEX idx_projectmembers_projectemail ON projectmembers(projectid, email);
CREATE INDEX idx_projectmembers_collaboratorprojects ON projectmembers(collaboratorid);
CREATE INDEX idx_projectmembers_projectuseremail ON projectmembers(projectid, userid, email);

-- Transacciones de proyecto
CREATE TABLE projecttransactions (
    id SERIAL PRIMARY KEY,
    projectid INT NOT NULL,
    createdbymemberid INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    status transactionstatus DEFAULT 'Pending',
    datecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approveddate TIMESTAMP,
    FOREIGN KEY (projectid) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (createdbymemberid) REFERENCES projectmembers(id)
);

-- Índices para project transactions
CREATE INDEX idx_projecttransactions_projectstatus ON projecttransactions(projectid, status);
CREATE INDEX idx_projecttransactions_createdbymember ON projecttransactions(createdbymemberid);
CREATE INDEX idx_projecttransactions_statusdate ON projecttransactions(status, datecreated);

-- Aprobaciones de transacciones
CREATE TABLE projecttransactionapprovals (
    id SERIAL PRIMARY KEY,
    transactionid INT NOT NULL,
    memberid INT NOT NULL,
    status approvalstatus DEFAULT 'Pending',
    approvaldate TIMESTAMP,
    rejectionreason TEXT,
    FOREIGN KEY (transactionid) REFERENCES projecttransactions(id) ON DELETE CASCADE,
    FOREIGN KEY (memberid) REFERENCES projectmembers(id),
    CONSTRAINT uniqueapproval UNIQUE (transactionid, memberid)
);

-- Índices para approvals
CREATE INDEX idx_transactionapprovals_transactionstatus ON projecttransactionapprovals(transactionid, status);
CREATE INDEX idx_transactionapprovals_memberstatus ON projecttransactionapprovals(memberid, status);

-- Liquidaciones finales
CREATE TABLE projectsettlements (
    id SERIAL PRIMARY KEY,
    projectid INT NOT NULL,
    debtormemberid INT NOT NULL,
    creditormemberid INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    issettled BOOLEAN DEFAULT FALSE,
    settlementdate TIMESTAMP,
    FOREIGN KEY (projectid) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (debtormemberid) REFERENCES projectmembers(id),
    FOREIGN KEY (creditormemberid) REFERENCES projectmembers(id)
);

-- Índices para settlements
CREATE INDEX idx_projectsettlements_projectsettled ON projectsettlements(projectid, issettled);
CREATE INDEX idx_projectsettlements_debtorcreditor ON projectsettlements(debtormemberid, creditormemberid);

-- ===== SISTEMA SEPARADO DE TRANSACCIONES GENERALES =====

-- Transacciones individuales (sin afectar proyectos)
-- ===== TRANSACCIONES INDIVIDUALES =====
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    userid INT NOT NULL,
    collaboratorid INT NOT NULL,
    totalamount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    splittype splittype DEFAULT 'Equal',
    whopaid VARCHAR(20) NOT NULL DEFAULT 'user',
    totalreimbursement DECIMAL(10,2) DEFAULT 0.00,
    netamount DECIMAL(10,2) GENERATED ALWAYS AS (totalamount - totalreimbursement) STORED,
    transactiondate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id),
    FOREIGN KEY (collaboratorid) REFERENCES collaborators(id),
    CONSTRAINT check_whopaid CHECK (whopaid IN ('user', 'collaborator')),
    CONSTRAINT check_totalreimbursement CHECK (totalreimbursement >= 0),
    CONSTRAINT check_totalreimbursement_not_exceed CHECK (totalreimbursement <= totalamount)
);

CREATE INDEX idx_transactions_userdate ON transactions(userid, transactiondate);
CREATE INDEX idx_transactions_collaboratordate ON transactions(collaboratorid, transactiondate);
CREATE INDEX idx_transactions_splittype ON transactions(splittype);
CREATE INDEX idx_transactions_whopaid ON transactions(whopaid);

-- ===== REINTEGROS DE TRANSACCIONES =====
CREATE TABLE transactionreimbursements (
    id SERIAL PRIMARY KEY,
    transactionid INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    reimbursementdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transactionid) REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT positive_reimbursement_amount CHECK (amount > 0)
);

CREATE INDEX idx_reimbursements_transaction ON transactionreimbursements(transactionid);

-- ===== SPLITS DE TRANSACCIONES =====
CREATE TABLE transactionsplits (
    id SERIAL PRIMARY KEY,
    transactionid INT NOT NULL,
    collaboratorid INT NULL,
    userid INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    sharepercentage DECIMAL(5,2),
    ispayer BOOLEAN DEFAULT FALSE,
    issettled BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (transactionid) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (collaboratorid) REFERENCES collaborators(id),
    FOREIGN KEY (userid) REFERENCES users(id),
    CONSTRAINT check_collaborator_or_user CHECK (
        (collaboratorid IS NOT NULL AND userid IS NULL) OR 
        (collaboratorid IS NULL AND userid IS NOT NULL)
    ),
    CONSTRAINT check_amount_not_negative CHECK (amount >= 0)
);

CREATE INDEX idx_transactionsplits_transactioncollaborator ON transactionsplits(transactionid, collaboratorid);
CREATE INDEX idx_transactionsplits_transactionuser ON transactionsplits(transactionid, userid);
CREATE INDEX idx_transactionsplits_collaboratorsettled ON transactionsplits(collaboratorid, issettled);
CREATE INDEX idx_transactionsplits_usersettled ON transactionsplits(userid, issettled);
CREATE INDEX idx_transactionsplits_payerstatus ON transactionsplits(ispayer, issettled);

-- ===== MÓDULO DE AHORROS =====

CREATE TABLE currencies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    country VARCHAR(100) NOT NULL,
    datecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO currencies (Id, Name, Symbol, Country) VALUES
(1, 'United States Dollar', '$', 'United States'),
(2, 'Euro', '€', 'Eurozone'),
(3, 'British Pound Sterling', '£', 'United Kingdom'),
(4, 'Guarani', '₲', 'Paraguay'),
(5, 'Argentine Peso', '$', 'Argentina'),
(6, 'Real', 'R$', 'Brazil'),
(7, 'Other', '$', '---');

-- Tabla de tipos de progresión de ahorro
CREATE TABLE savingsprogressiontypes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL
);

-- Datos iniciales
INSERT INTO savingsprogressiontypes (id, name, description) VALUES
(1, 'Fixed', 'Fixed amount per installment - the same amount is saved in each period'),
(2, 'Ascending', 'Ascending amounts - each installment increases by adding a fixed increment to the previous amount'),
(3, 'Descending', 'Descending amounts - each installment decreases by subtracting a fixed increment from the previous amount'),
(4, 'Random', 'Random amounts - installments are shuffled randomly based on an ascending progression'),
(5, 'FreeForm', 'Free form - no predefined installments, user adds deposits freely until reaching the target amount');

-- Tabla de estados de ahorro
CREATE TABLE savingsstatus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL
);

INSERT INTO savingsstatus (id, name, description) VALUES
(1, 'Active', 'Savings goal is currently active and accepting deposits'),
(2, 'Completed', 'Savings goal has been completed - target amount reached'),
(3, 'Paused', 'Savings goal is temporarily paused'),
(4, 'Cancelled', 'Savings goal has been cancelled by the user');

-- Tabla de estados de cuota
CREATE TABLE installmentstatus (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL
);

INSERT INTO installmentstatus (id, name, description) VALUES
(1, 'Pending', 'Installment has not been paid yet'),
(2, 'Paid', 'Installment has been fully paid'),
(3, 'Skipped', 'Installment was intentionally skipped by the user');

-- Meta de ahorro principal
CREATE TABLE savingsgoals (
    id SERIAL PRIMARY KEY,
    userid INT NOT NULL,
    currencyid INT NOT NULL,

    -- Información básica
    name VARCHAR(200) NOT NULL,
    description TEXT,
    targetamount BIGINT NOT NULL, -- Monto objetivo total (entero)
    currentamount BIGINT DEFAULT 0, -- Monto acumulado actual

    -- Configuración de cuotas (NULL para FreeForm)
    progressiontypeid INT NOT NULL,
    numberofinstallments INT NULL, -- NULL para FreeForm
    baseamount BIGINT NULL, -- NULL para FreeForm
    incrementamount BIGINT NULL, -- Solo para Ascending/Descending

    -- Estado y fechas
    statusid INT NOT NULL DEFAULT 1, -- Default: Active
    startdate DATE NOT NULL,
    expectedenddate DATE NULL, -- Calculado en backend
    completeddate TIMESTAMP NULL,

    -- Timestamps
    datecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dateupdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (userid) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (currencyid) REFERENCES currencies(id),
    FOREIGN KEY (progressiontypeid) REFERENCES savingsprogressiontypes(id),
    FOREIGN KEY (statusid) REFERENCES savingsstatus(id),

    -- Validaciones
    CONSTRAINT check_target_positive CHECK (targetamount > 0),
    CONSTRAINT check_current_not_negative CHECK (currentamount >= 0),
    CONSTRAINT check_current_not_exceed_target CHECK (currentamount <= targetamount),
    CONSTRAINT check_freeform_nulls CHECK (
        (progressiontypeid = 5 AND numberofinstallments IS NULL AND baseamount IS NULL) OR
        (progressiontypeid != 5 AND numberofinstallments IS NOT NULL AND baseamount IS NOT NULL)
    ),
    CONSTRAINT check_base_positive CHECK (baseamount IS NULL OR baseamount > 0),
    CONSTRAINT check_installments_positive CHECK (numberofinstallments IS NULL OR numberofinstallments > 0),
    CONSTRAINT check_increment_for_progression CHECK (
        (progressiontypeid IN (1, 4, 5) AND incrementamount IS NULL) OR
        (progressiontypeid IN (2, 3) AND incrementamount IS NOT NULL AND incrementamount > 0)
    )
);

-- Cuotas individuales de ahorro
CREATE TABLE savingsinstallments (
    id SERIAL PRIMARY KEY,
    savingsgoalid INT NOT NULL,

    -- Información de la cuota
    installmentnumber INT NOT NULL, -- Número de cuota (1, 2, 3...)
    amount BIGINT NOT NULL, -- Monto de esta cuota específica
    statusid INT NOT NULL DEFAULT 1, -- Default: Pending

    -- Fechas
    duedate DATE NULL, -- Fecha sugerida (opcional)
    paiddate TIMESTAMP NULL,

    -- Metadata
    datecreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (savingsgoalid) REFERENCES savingsgoals(id) ON DELETE CASCADE,
    FOREIGN KEY (statusid) REFERENCES installmentstatus(id),

    -- Validaciones
    CONSTRAINT check_installment_amount_positive CHECK (amount > 0),
    CONSTRAINT check_installment_number_positive CHECK (installmentnumber > 0),
    CONSTRAINT unique_installment_per_goal UNIQUE (savingsgoalid, installmentnumber)
);

-- Depósitos/pagos realizados
CREATE TABLE savingsdeposits (
    id SERIAL PRIMARY KEY,
    savingsgoalid INT NOT NULL,
    installmentid INT NULL, -- NULL si es depósito libre (FreeForm o pago adicional)

    amount BIGINT NOT NULL,
    description VARCHAR(255),
    depositdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (savingsgoalid) REFERENCES savingsgoals(id) ON DELETE CASCADE,
    FOREIGN KEY (installmentid) REFERENCES savingsinstallments(id) ON DELETE SET NULL,

    CONSTRAINT check_deposit_positive CHECK (amount > 0)
);

-- ===== ÍNDICES PARA AHORROS =====

-- Índices para savingsgoals
CREATE INDEX idx_savingsgoals_user_status ON savingsgoals(userid, statusid);
CREATE INDEX idx_savingsgoals_currency ON savingsgoals(currencyid);
CREATE INDEX idx_savingsgoals_progression_status ON savingsgoals(progressiontypeid, statusid);
CREATE INDEX idx_savingsgoals_status ON savingsgoals(statusid);
CREATE INDEX idx_savingsgoals_user_progression ON savingsgoals(userid, progressiontypeid);

-- Índices para savingsinstallments
CREATE INDEX idx_savingsinstallments_goal_status ON savingsinstallments(savingsgoalid, statusid);
CREATE INDEX idx_savingsinstallments_goal_number ON savingsinstallments(savingsgoalid, installmentnumber);
CREATE INDEX idx_savingsinstallments_status_duedate ON savingsinstallments(statusid, duedate);
CREATE INDEX idx_savingsinstallments_status ON savingsinstallments(statusid);

-- Índices para savingsdeposits
CREATE INDEX idx_savingsdeposits_goal_date ON savingsdeposits(savingsgoalid, depositdate);
CREATE INDEX idx_savingsdeposits_installment ON savingsdeposits(installmentid);
CREATE INDEX idx_savingsdeposits_goal ON savingsdeposits(savingsgoalid);

-- ===== VISTA ÚTIL PARA REPORTES =====

-- Vista que combina información de goals con sus tipos y estados
CREATE VIEW v_savingsgoals_details AS
SELECT 
    sg.id,
    sg.userid,
    sg.name,
    sg.description,
    sg.targetamount,
    sg.currentamount,
    sg.targetamount - sg.currentamount AS remainingamount,
    CASE 
        WHEN sg.targetamount > 0 THEN ROUND((sg.currentamount::NUMERIC / sg.targetamount::NUMERIC) * 100, 2)
        ELSE 0 
    END AS progresspercentage,
    sg.numberofinstallments,
    sg.baseamount,
    sg.incrementamount,
    sg.startdate,
    sg.expectedenddate,
    sg.completeddate,
    sg.datecreated,
    spt.name AS progressiontype,
    spt.description AS progressiondescription,
    ss.name AS status,
    ss.description AS statusdescription,
    c.name AS currencyname,
    c.symbol AS currencysymbol,
    -- Contar cuotas
    (SELECT COUNT(*) FROM savingsinstallments WHERE savingsgoalid = sg.id) AS totalinstallments,
    (SELECT COUNT(*) FROM savingsinstallments WHERE savingsgoalid = sg.id AND statusid = 2) AS paidinstallments,
    (SELECT COUNT(*) FROM savingsinstallments WHERE savingsgoalid = sg.id AND statusid = 1) AS pendinginstallments,
    -- Contar depósitos
    (SELECT COUNT(*) FROM savingsdeposits WHERE savingsgoalid = sg.id) AS totaldeposits
FROM savingsgoals sg
INNER JOIN savingsprogressiontypes spt ON sg.progressiontypeid = spt.id
INNER JOIN savingsstatus ss ON sg.statusid = ss.id
INNER JOIN currencies c ON sg.currencyid = c.id;

-- Vista para cuotas con detalles
CREATE VIEW v_savingsinstallments_details AS
SELECT 
    si.id,
    si.savingsgoalid,
    si.installmentnumber,
    si.amount,
    si.duedate,
    si.paiddate,
    si.datecreated,
    ist.name AS status,
    ist.description AS statusdescription,
    sg.name AS goalname,
    sg.userid,
    -- Total depositado para esta cuota específica
    (SELECT COALESCE(SUM(amount), 0) FROM savingsdeposits WHERE installmentid = si.id) AS totaldepositedforinstallment
FROM savingsinstallments si
INNER JOIN installmentstatus ist ON si.statusid = ist.id
INNER JOIN savingsgoals sg ON si.savingsgoalid = sg.id;