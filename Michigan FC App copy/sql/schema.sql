-- ============================================================
-- Michigan FC – Database Schema (Azure SQL / SQL Server)
-- Idempotent: safe to run repeatedly.
-- ============================================================

-- 1. Users
IF OBJECT_ID('dbo.Users', 'U') IS NULL
CREATE TABLE dbo.Users (
  id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  name         NVARCHAR(200)    NOT NULL,
  email        NVARCHAR(255)    NOT NULL,
  phone        NVARCHAR(30)     NULL,
  passwordHash NVARCHAR(255)    NOT NULL,
  language     NVARCHAR(5)      NOT NULL DEFAULT 'en',  -- 'en' | 'ar'
  createdAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_Users       PRIMARY KEY (id),
  CONSTRAINT UQ_Users_email UNIQUE (email)
);
GO

-- 2. UserRoles
IF OBJECT_ID('dbo.UserRoles', 'U') IS NULL
CREATE TABLE dbo.UserRoles (
  id     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  userId UNIQUEIDENTIFIER NOT NULL,
  role   NVARCHAR(20)     NOT NULL,  -- PARENT | COACH | DIRECTOR
  CONSTRAINT PK_UserRoles      PRIMARY KEY (id),
  CONSTRAINT FK_UserRoles_User FOREIGN KEY (userId) REFERENCES dbo.Users(id),
  CONSTRAINT UQ_UserRoles      UNIQUE (userId, role)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserRoles_userId')
  CREATE NONCLUSTERED INDEX IX_UserRoles_userId ON dbo.UserRoles(userId);
GO

-- 3. Teams
IF OBJECT_ID('dbo.Teams', 'U') IS NULL
CREATE TABLE dbo.Teams (
  id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  name      NVARCHAR(150)    NOT NULL,
  createdAt DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_Teams      PRIMARY KEY (id),
  CONSTRAINT UQ_Teams_name UNIQUE (name)
);
GO

-- 4. Players
IF OBJECT_ID('dbo.Players', 'U') IS NULL
CREATE TABLE dbo.Players (
  id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  parentId  UNIQUEIDENTIFIER NOT NULL,
  teamId    UNIQUEIDENTIFIER NULL,
  name      NVARCHAR(200)    NOT NULL,
  ageGroup  NVARCHAR(20)     NULL,
  createdAt DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_Players        PRIMARY KEY (id),
  CONSTRAINT FK_Players_Parent FOREIGN KEY (parentId) REFERENCES dbo.Users(id),
  CONSTRAINT FK_Players_Team   FOREIGN KEY (teamId)   REFERENCES dbo.Teams(id)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Players_parentId')
  CREATE NONCLUSTERED INDEX IX_Players_parentId ON dbo.Players(parentId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Players_teamId')
  CREATE NONCLUSTERED INDEX IX_Players_teamId ON dbo.Players(teamId);
GO

-- 5. Events
IF OBJECT_ID('dbo.Events', 'U') IS NULL
CREATE TABLE dbo.Events (
  id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  teamId    UNIQUEIDENTIFIER NULL,
  type      NVARCHAR(50)     NOT NULL,  -- PRACTICE | GAME | MEETING | OTHER
  title     NVARCHAR(255)    NOT NULL,
  titleAr   NVARCHAR(255)    NULL,
  startsAt  DATETIME2        NOT NULL,
  location  NVARCHAR(255)    NULL,
  createdBy UNIQUEIDENTIFIER NOT NULL,
  createdAt DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_Events         PRIMARY KEY (id),
  CONSTRAINT FK_Events_Team    FOREIGN KEY (teamId)    REFERENCES dbo.Teams(id),
  CONSTRAINT FK_Events_Creator FOREIGN KEY (createdBy) REFERENCES dbo.Users(id)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Events_teamId')
  CREATE NONCLUSTERED INDEX IX_Events_teamId ON dbo.Events(teamId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Events_startsAt')
  CREATE NONCLUSTERED INDEX IX_Events_startsAt ON dbo.Events(startsAt DESC);
GO

-- 6. Notifications
IF OBJECT_ID('dbo.Notifications', 'U') IS NULL
CREATE TABLE dbo.Notifications (
  id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  userId      UNIQUEIDENTIFIER NOT NULL,
  eventId     UNIQUEIDENTIFIER NULL,
  title       NVARCHAR(255)    NOT NULL,
  message     NVARCHAR(MAX)    NOT NULL,
  createdAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  deliveredAt DATETIME2        NULL,
  CONSTRAINT PK_Notifications       PRIMARY KEY (id),
  CONSTRAINT FK_Notifications_User  FOREIGN KEY (userId)  REFERENCES dbo.Users(id),
  CONSTRAINT FK_Notifications_Event FOREIGN KEY (eventId) REFERENCES dbo.Events(id)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notifications_userId')
  CREATE NONCLUSTERED INDEX IX_Notifications_userId ON dbo.Notifications(userId, createdAt DESC);
GO

-- 7. DeviceTokens
IF OBJECT_ID('dbo.DeviceTokens', 'U') IS NULL
CREATE TABLE dbo.DeviceTokens (
  id        UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  userId    UNIQUEIDENTIFIER NOT NULL,
  token     NVARCHAR(500)    NOT NULL,
  platform  NVARCHAR(20)     NOT NULL DEFAULT 'android',
  updatedAt DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_DeviceTokens       PRIMARY KEY (id),
  CONSTRAINT FK_DeviceTokens_User  FOREIGN KEY (userId) REFERENCES dbo.Users(id),
  CONSTRAINT UQ_DeviceTokens_token UNIQUE (token)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_DeviceTokens_userId')
  CREATE NONCLUSTERED INDEX IX_DeviceTokens_userId ON dbo.DeviceTokens(userId);
GO
