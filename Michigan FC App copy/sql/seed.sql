-- ============================================================
-- Michigan FC – Seed Data
-- Creates a director account and a sample team.
-- Password for the director: Director1!
-- ============================================================

-- Director user (password = "Director1!" hashed with bcrypt cost 12)
-- Generate your own hash with:  node -e "require('bcrypt').hash('Director1!',12).then(console.log)"
DECLARE @directorId UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000001';
DECLARE @coachId    UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000002';
DECLARE @teamId     UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000010';

-- Director
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE id = @directorId)
BEGIN
  INSERT INTO dbo.Users (id, name, email, passwordHash, language)
  VALUES (@directorId, 'Admin Director', 'director@michiganfc.com',
          '$2b$12$LJ3m4ys4Lz0QqGJbGzSMaOTKIiNMFHFGqWSFvrPPdOevBkkT5vXKi', 'en');
  INSERT INTO dbo.UserRoles (userId, role) VALUES (@directorId, 'DIRECTOR');
END;

-- Coach
IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE id = @coachId)
BEGIN
  INSERT INTO dbo.Users (id, name, email, passwordHash, language)
  VALUES (@coachId, 'Sample Coach', 'coach@michiganfc.com',
          '$2b$12$LJ3m4ys4Lz0QqGJbGzSMaOTKIiNMFHFGqWSFvrPPdOevBkkT5vXKi', 'en');
  INSERT INTO dbo.UserRoles (userId, role) VALUES (@coachId, 'COACH');
END;

-- Team
IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE id = @teamId)
BEGIN
  INSERT INTO dbo.Teams (id, name) VALUES (@teamId, 'U12 Lions');
END;
GO
