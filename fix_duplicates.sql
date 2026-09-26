-- Update Фулл-хаус
UPDATE user_achievements 
SET "achievementId" = 'e143c618-233c-4ca1-8033-816b9117a014' 
WHERE "achievementId" = '2448428a-04d8-4012-8992-80d227a60c84'
AND NOT EXISTS (
    SELECT 1 FROM user_achievements ua2 
    WHERE ua2."userId" = user_achievements."userId" 
    AND ua2."achievementId" = 'e143c618-233c-4ca1-8033-816b9117a014'
);

-- Delete remaining duplicates for Фулл-хаус
DELETE FROM user_achievements WHERE "achievementId" = '2448428a-04d8-4012-8992-80d227a60c84';
DELETE FROM achievements WHERE id = '2448428a-04d8-4012-8992-80d227a60c84';

-- Update Теперь я не дворняга
UPDATE user_achievements 
SET "achievementId" = '49e07554-fb63-4abf-824c-072976aef31b' 
WHERE "achievementId" = '18c14e58-e864-4d57-abff-615b4eea0f52'
AND NOT EXISTS (
    SELECT 1 FROM user_achievements ua2 
    WHERE ua2."userId" = user_achievements."userId" 
    AND ua2."achievementId" = '49e07554-fb63-4abf-824c-072976aef31b'
);

-- Delete remaining duplicates for Теперь я не дворняга
DELETE FROM user_achievements WHERE "achievementId" = '18c14e58-e864-4d57-abff-615b4eea0f52';
DELETE FROM achievements WHERE id = '18c14e58-e864-4d57-abff-615b4eea0f52';
