-- Add Difficulty column to SESSIONS for adaptive scenarios
ALTER TABLE SESSIONS ADD COLUMN Difficulty VARCHAR(20) DEFAULT 'intermediate';
