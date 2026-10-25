import { execFileSync } from 'child_process';

const sql = `
SET QUOTED_IDENTIFIER ON;
DECLARE @repId UNIQUEIDENTIFIER = 'A558C872-ECF1-4319-A726-74990FDDAABC';
DECLARE @asgId UNIQUEIDENTIFIER = '74321C22-7762-42EC-986D-B5E92C40FAAA';
UPDATE DefectReports SET Status = 'Open', ResolutionNote = NULL, ResolvedByUserId = NULL, ResolvedAtUtc = NULL, ReprintRunId = NULL, RefundId = NULL WHERE Id = @repId;
DELETE FROM Notifications WHERE OutboxMessageId IN (SELECT Id FROM OutboxMessages WHERE DeduplicationKey LIKE '%a558c872-ecf1-4319-a726-74990fddaabc%');
DELETE FROM OutboxMessages WHERE DeduplicationKey LIKE '%a558c872-ecf1-4319-a726-74990fddaabc%';
DELETE FROM OrderStatusHistories WHERE OperationKey LIKE '%a558c872-ecf1-4319-a726-74990fddaabc%';
DELETE FROM ProductionRuns WHERE AssignmentId = @asgId AND RunNo > 1;
UPDATE Orders SET FulfillmentStatus = 'Completed', ReprintApproved = 0 WHERE Id = '6F51BB53-DA8E-40DB-8CC7-107E409F15D6';
UPDATE Users SET AccountStatus = 'Active' WHERE Email IN ('admin@123', 'customer@123');
`;

try {
  const out = execFileSync('sqlcmd', ['-S', '(localdb)\\mssqllocaldb', '-d', 'TheBoysDb', '-b', '-Q', sql], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  console.log('SQL OK:\n' + out);
} catch (err) {
  console.error('SQL ERR STDOUT:\n' + err.stdout);
  console.error('SQL ERR STDERR:\n' + err.stderr);
}
