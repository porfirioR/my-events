-- INSERT INTO currencies (Id, Name, Symbol, Country) VALUES
-- (1, 'United States Dollar', '$', 'United States'),
-- (2, 'Euro', '€', 'Eurozone'),
-- (3, 'British Pound Sterling', '£', 'United Kingdom'),
-- (4, 'Guarani', '₲', 'Paraguay'),
-- (5, 'Argentine Peso', '$', 'Argentina'),
-- (6, 'Real', 'R$', 'Brazil'),
-- (7, 'Other', '$', '---');

-- INSERT INTO Periods (Id, Name, quantity) VALUES
-- (1, 'Day', 365),
-- (2, 'Week', 52),
-- (3, 'Month', 12),
-- (4, 'Custom', -1);

-- INSERT INTO [Types] (Id, name, Description) VALUES
-- (1, 'Progressive', 'Amounts increase by adding a constant value'),
-- (2, 'Fixed amount', 'Fixed amount for the duration of the loan'),
-- (3, 'Total', 'Total amount of the loan');

-- ===== SCHEMA POSTGRESQL MÍNIMO - SOLO TABLAS =====

-- Tipos ENUM personalizados
CREATE TYPE matchstatus AS ENUM ('Pending', 'Accepted', 'Rejected', 'EmailNotFound', 'Expired');
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

-- Colaboradores - email NULL = interno, email valor = externo
CREATE TABLE collaborators (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(150), -- NULL = colaborador INTERNO, valor = colaborador EXTERNO
    userid INT NOT NULL,
    createddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id)
);

-- Índices para colaboradores
CREATE INDEX idx_collaborators_userid ON collaborators(userid);
CREATE INDEX idx_collaborators_email ON collaborators(email);
CREATE INDEX idx_collaborators_useremail ON collaborators(userid, email);
CREATE INDEX idx_collaborators_usertype ON collaborators(userid, email);

-- Solicitudes de matching entre colaboradores (solo para externos)
CREATE TABLE collaboratormatchrequests (
    id SERIAL PRIMARY KEY,
    requesteruserid INT NOT NULL,
    requestercollaboratorid INT NOT NULL,
    targetuserid INT NULL,
    targetcollaboratoremail VARCHAR(150) NOT NULL,
    status matchstatus DEFAULT 'Pending',
    requesteddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responsedate TIMESTAMP,
    FOREIGN KEY (requesteruserid) REFERENCES users(id),
    FOREIGN KEY (requestercollaboratorid) REFERENCES collaborators(id),
    FOREIGN KEY (targetuserid) REFERENCES users(id),
    CONSTRAINT uniquerequest UNIQUE (requestercollaboratorid, targetuserid, targetcollaboratoremail)
);

-- Índices para match requests
CREATE INDEX idx_matchrequests_targetstatus ON collaboratormatchrequests(targetuserid, status);
CREATE INDEX idx_matchrequests_requesterstatus ON collaboratormatchrequests(requesteruserid, status);

-- Matches aceptados entre colaboradores externos
CREATE TABLE collaboratormatches (
    id SERIAL PRIMARY KEY,
    collaborator1id INT NOT NULL,
    collaborator2id INT NOT NULL,
    user1id INT NOT NULL,
    user2id INT NOT NULL,
    email VARCHAR(150) NOT NULL, -- Email común (ambos colaboradores deben ser externos)
    createddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (collaborator1id) REFERENCES collaborators(id),
    FOREIGN KEY (collaborator2id) REFERENCES collaborators(id),
    FOREIGN KEY (user1id) REFERENCES users(id),
    FOREIGN KEY (user2id) REFERENCES users(id),
    CONSTRAINT uniquematch UNIQUE (collaborator1id, collaborator2id)
);

-- Índices para matches
CREATE INDEX idx_matches_user1email ON collaboratormatches(user1id, email);
CREATE INDEX idx_matches_user2email ON collaboratormatches(user2id, email);
CREATE INDEX idx_matches_emailusers ON collaboratormatches(email, user1id, user2id);

-- Tabla de proyectos
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    userid INT NOT NULL,
    status projectstatus DEFAULT 'Active',
    createddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalizeddate TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id)
);

-- Índices para proyectos
CREATE INDEX idx_projects_createdbyuser ON projects(userid);
CREATE INDEX idx_projects_status ON projects(status);

-- Miembros del proyecto - email NULL para internos, valor para externos
CREATE TABLE projectmembers (
    id SERIAL PRIMARY KEY,
    projectid INT NOT NULL,
    userid INT NOT NULL,
    collaboratorid INT NOT NULL,
    email VARCHAR(150), -- NULL si colaborador interno, valor si externo con match
    joineddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projectid) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (userid) REFERENCES users(id),
    FOREIGN KEY (collaboratorid) REFERENCES collaborators(id),
    -- Un colaborador solo puede estar una vez por proyecto
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
    createddate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approveddate TIMESTAMP,
    FOREIGN KEY (projectid) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (createdbymemberid) REFERENCES projectmembers(id)
);

-- Índices para project transactions
CREATE INDEX idx_projecttransactions_projectstatus ON projecttransactions(projectid, status);
CREATE INDEX idx_projecttransactions_createdbymember ON projecttransactions(createdbymemberid);
CREATE INDEX idx_projecttransactions_statusdate ON projecttransactions(status, createddate);

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
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    userid INT NOT NULL,
    collaboratorid INT NOT NULL,
    totalamount DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    splittype splittype DEFAULT 'Equal',
    transactiondate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userid) REFERENCES users(id),
    FOREIGN KEY (collaboratorid) REFERENCES collaborators(id)
);

-- Índices para transactions
CREATE INDEX idx_transactions_userdate ON transactions(userid, transactiondate);
CREATE INDEX idx_transactions_collaboratordate ON transactions(collaboratorid, transactiondate);
CREATE INDEX idx_transactions_splittype ON transactions(splittype);

CREATE TABLE transactionsplits (
    id SERIAL PRIMARY KEY,
    transactionid INT NOT NULL,
    collaboratorid INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    sharepercentage DECIMAL(5,2),
    ispayer BOOLEAN DEFAULT FALSE,
    issettled BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (transactionid) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (collaboratorid) REFERENCES collaborators(id)
);

-- Índices para transaction splits
CREATE INDEX idx_transactionsplits_transactioncollaborator ON transactionsplits(transactionid, collaboratorid);
CREATE INDEX idx_transactionsplits_collaboratorsettled ON transactionsplits(collaboratorid, issettled);
CREATE INDEX idx_transactionsplits_payerstatus ON transactionsplits(ispayer, issettled);
