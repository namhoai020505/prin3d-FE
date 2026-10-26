-- Development fixture. Run against the backend development database with sqlcmd -b -f 65001.
-- Idempotent; inserts demo business records only. Never modifies Users or credentials.
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @customer uniqueidentifier = (SELECT TOP (1) Id FROM Users WHERE Role = 0 AND IsDeleted = 0 ORDER BY CreatedAtUtc);
DECLARE @manager uniqueidentifier = (SELECT TOP (1) Id FROM Users WHERE Role IN (4, 3) AND IsDeleted = 0 ORDER BY Role DESC);
DECLARE @package uniqueidentifier = (SELECT TOP (1) Id FROM PricingPackages WHERE IsActive = 1 ORDER BY CreatedAtUtc);
IF @customer IS NULL OR @manager IS NULL OR @package IS NULL
    THROW 50001, 'An existing customer, manager/admin and active pricing package are required.', 1;

DECLARE @now datetime2 = SYSUTCDATETIME();
DECLARE @lab uniqueidentifier = (SELECT TOP (1) Id FROM PartnerLabs WHERE IsActive = 1 ORDER BY CreatedAtUtc);
IF @lab IS NULL
BEGIN
    SET @lab = NEWID();
    INSERT PartnerLabs (Id, LabName, ContactPerson, PhoneNumber, District, Address, CapacityPerDay, IsActive, CreatedAtUtc)
    VALUES (@lab, N'Xưởng thử nghiệm Manager', N'Bộ phận sản xuất thử nghiệm', '0900000000', N'Bình Thạnh', N'Địa chỉ thử nghiệm, TP. Hồ Chí Minh', 20, 1, @now);
END;

DECLARE @project uniqueidentifier = (SELECT TOP (1) Id FROM ModelProjects WHERE Name = N'[Manager demo] Mô hình kiểm thử');
IF @project IS NULL
BEGIN
    SET @project = NEWID();
    INSERT ModelProjects (Id, UserId, Name, CreatedAtUtc) VALUES (@project, @customer, N'[Manager demo] Mô hình kiểm thử', @now);
END;
DECLARE @generation uniqueidentifier = (SELECT TOP (1) Id FROM GenerationTasks WHERE ClientRequestId = 'manager-demo-generation');
IF @generation IS NULL
BEGIN
    SET @generation = NEWID();
    INSERT GenerationJobs (Id, ProjectId, UserId, Operation, Provider, ProviderModel, ApiVersion, PolicyVersion, PricingVersion, AccountScope, InputHash, RequestedHeightMm, Status, ClientRequestId, RequestFingerprint, CreatedAtUtc, CompletedAtUtc)
    VALUES (@generation, @project, @customer, 'ImageTo3D', 'Development', 'demo', 'v1', 'demo', 'demo', 'development', HASHBYTES('SHA2_256', 'manager-demo'), 110, 'Succeeded', NEWID(), HASHBYTES('SHA2_256', 'manager-demo-job'), @now, @now);
    INSERT GenerationTasks (Id, UserId, TaskType, Status, RetryCount, IsWatertight, IsApprovedForPrinting, CreatedAtUtc, IsDeleted, ModelName, ClientRequestId, AiModel, Provider, RequestedHeightMm, Progress, Stage, ReviewStatus, CompletedAtUtc, BoundingBoxX_Mm, BoundingBoxY_Mm, BoundingBoxZ_Mm, EstimatedVolumeCm3, Polycount, PrintabilityStatus, PrintabilityJson)
    VALUES (@generation, @customer, 1, 3, 0, 1, 0, @now, 0, N'[Demo] Tượng trưng bày 110 mm', 'manager-demo-generation', 'demo', 'Development', 110, 100, 4, 0, @now, 60, 55, 110, 72, 24000, 'Passed', N'{"status":"Passed","metrics":{"volumeCm3":72,"triangleCount":24000,"dimensionsMm":{"x":60,"y":55,"z":110}}}');
END;
DECLARE @version uniqueidentifier = (SELECT TOP (1) Id FROM ModelVersions WHERE SourceJobId = @generation);
IF @version IS NULL
BEGIN
    SET @version = NEWID();
    INSERT ModelVersions (Id, ProjectId, SourceJobId, VersionNo, GeometryHash, WidthMm, DepthMm, HeightMm, VolumeCm3, IsWatertight, PrintabilityStatus, AnalysisCoverage, IsPublished, PublishedAtUtc, CreatedAtUtc)
    VALUES (@version, @project, @generation, 1, HASHBYTES('SHA2_256', 'manager-demo-model'), 60, 55, 110, 72, 1, 'Passed', 'GeometryOnly', 1, @now, @now);
END;

DECLARE @fixtures TABLE (No int, Fulfillment varchar(30), Payment varchar(20), LegacyStatus int, RunStatus nvarchar(30), ShipmentStatus nvarchar(30));
INSERT @fixtures VALUES
    (1, 'AwaitingAssignment', 'Paid', 2, NULL, NULL),
    (2, 'Assigned', 'Paid', 3, NULL, NULL),
    (3, 'InProduction', 'Paid', 4, 'Printing', NULL),
    (4, 'InProduction', 'Paid', 6, 'PostProcessing', NULL),
    (5, 'QualityCheck', 'Paid', 6, 'QualityCheck', NULL),
    (6, 'Packaged', 'Paid', 7, 'Passed', NULL),
    (7, 'Shipped', 'Paid', 8, 'Passed', 'Shipping'),
    (8, 'Delivered', 'Paid', 9, 'Passed', 'Delivered'),
    (9, 'Cancelled', 'Refunded', 10, NULL, NULL),
    (10, 'PendingPayment', 'Unpaid', 1, NULL, NULL),
    (11, 'AwaitingAssignment', 'Paid', 2, NULL, NULL),
    (12, 'Delivered', 'Paid', 9, 'Passed', 'Delivered');

DECLARE @no int = 1;
WHILE @no <= 12
BEGIN
    DECLARE @code varchar(50) = CONCAT('TB-DEMO-MGR-', RIGHT(CONCAT('00', @no), 3));
    IF NOT EXISTS (SELECT 1 FROM Orders WHERE OrderCode = @code)
    BEGIN
        DECLARE @order uniqueidentifier = NEWID(), @assignment uniqueidentifier = NEWID(), @shipment uniqueidentifier = NEWID(), @attempt uniqueidentifier = NEWID();
        DECLARE @fulfillment varchar(30), @payment varchar(20), @status int, @run nvarchar(30), @shipmentStatus nvarchar(30);
        SELECT @fulfillment = Fulfillment, @payment = Payment, @status = LegacyStatus, @run = RunStatus, @shipmentStatus = ShipmentStatus FROM @fixtures WHERE No = @no;
        DECLARE @price decimal(18,2), @partnerCost decimal(18,2), @material nvarchar(50);
        SELECT @price = PriceVnd, @partnerCost = PartnerBaseCostVnd, @material = Material FROM PricingPackages WHERE Id = @package;
        DECLARE @quantity int = CASE WHEN @no % 3 = 0 THEN 2 ELSE 1 END;
        DECLARE @created datetime2 = DATEADD(hour, -@no * 3, @now);
        INSERT Orders (Id, OrderCode, UserId, GenerationTaskId, PricingPackageId, PartnerLabId, Status, UnitPriceSnapshot, PartnerCostSnapshot, AiCostBudgetSnapshot, DefectBudgetSnapshot, ShippingSubsidySnapshot, PaymentGatewayFeeSnapshot, Quantity, SubTotalVnd, ShippingFeeRaw, FinalShippingFee, TotalAmount, ReceiverName, ReceiverPhone, StreetAddress, District, City, CustomerNote, ReprintApproved, CreatedAtUtc, ClientRequestId, DepthMmSnapshot, HeightMmSnapshot, MaterialSnapshot, PrintHeightMm, RequestFingerprint, WidthMmSnapshot, FulfillmentStatus, OrderPaymentStatus, PaidAtUtc, DeliveredAtUtc)
        VALUES (@order, @code, @customer, @generation, @package, CASE WHEN @no BETWEEN 2 AND 8 OR @no = 12 THEN @lab END, @status, @price, @partnerCost, 0, 0, 0, 0, @quantity, @price * @quantity, 30000, 30000, @price * @quantity + 30000, CONCAT(N'Khách thử nghiệm ', @no), '0900000000', N'Địa chỉ dữ liệu thử nghiệm', N'Bình Thạnh', N'TP. Hồ Chí Minh', N'[Manager demo] Dữ liệu thử giao diện; không giao hàng hay thu tiền thực tế.', 0, @created, CONVERT(nvarchar(36), NEWID()), 55, 110, @material, 110, CONVERT(nvarchar(36), NEWID()), 60, @fulfillment, @payment, CASE WHEN @payment <> 'Unpaid' THEN @created END, CASE WHEN @fulfillment = 'Delivered' THEN @now END);
        INSERT OrderItems (Id, OrderId, LineNumber, VersionId, ConfigurationHash, AssetHash, Quantity, UnitPriceVnd, MaterialSnapshot, HeightMm, PartnerUnitBudgetVnd)
        VALUES (NEWID(), @order, 1, @version, HASHBYTES('SHA2_256', CONCAT(@code, '-config')), HASHBYTES('SHA2_256', 'manager-demo-model'), @quantity, @price, @material, 110, @partnerCost);
        INSERT OrderStatusHistories (Id, OrderId, Axis, ToStatus, ActorUserId, Source, Reason, OperationKey, CreatedAtUtc)
        VALUES (NEWID(), @order, 'Fulfillment', @fulfillment, @manager, 'DevelopmentFixture', N'Dữ liệu thử nghiệm Manager', NEWID(), @created);
        IF @no BETWEEN 2 AND 8 OR @no = 12
        BEGIN
            INSERT PartnerAssignments (Id, OrderId, PartnerLabId, AssignedByUserId, Status, IsActive, PartnerCostSnapshotVnd, DueAtUtc, DecisionNote, CreatedAtUtc)
            VALUES (@assignment, @order, @lab, @manager, CASE WHEN @no = 2 THEN 'Offered' ELSE 'Accepted' END, 1, @partnerCost, DATEADD(day, 3, @now), N'Phân công thử nghiệm', @created);
            IF @run IS NOT NULL
                INSERT ProductionRuns (Id, AssignmentId, RunNo, Status, Quantity, StartedAtUtc, CompletedAtUtc, QcNote, QcEvidenceStorageKey)
                VALUES (NEWID(), @assignment, 1, @run, @quantity, @created, CASE WHEN @run = 'Passed' THEN @now END, CASE WHEN @run = 'Passed' THEN N'Đã đạt QC thử nghiệm' END, CASE WHEN @run = 'Passed' THEN 'development/manager-demo/qc-evidence' END);
        END;
        IF @shipmentStatus IS NOT NULL
        BEGIN
            INSERT Shipments (Id, OrderId, Carrier, TrackingNumber, Status, CreatedAtUtc, DeliveredAtUtc, DeliveryEvidenceStorageKey)
            VALUES (@shipment, @order, 'Development', CONCAT('DEMO-', @code), @shipmentStatus, @created, CASE WHEN @shipmentStatus = 'Delivered' THEN @now END, CASE WHEN @shipmentStatus = 'Delivered' THEN 'development/manager-demo/delivery-evidence' END);
            INSERT ShipmentEvents (Id, ShipmentId, EventKey, Status, Source, ActorUserId, OccurredAtUtc, ReceivedAtUtc)
            VALUES (NEWID(), @shipment, NEWID(), @shipmentStatus, 'DevelopmentFixture', @manager, @now, @now);
        END;
        INSERT PaymentAttempts (Id, OrderId, Gateway, MerchantReference, Status, AmountVnd, Currency, ExpiresAtUtc, CreatedAtUtc, CapturedAtUtc)
        VALUES (@attempt, @order, 'Sandbox', CONCAT('DEMO-', @code), CASE WHEN @no = 10 THEN 'NeedsAttention' ELSE 'Succeeded' END, @price * @quantity + 30000, 'VND', DATEADD(day, 1, @now), @created, CASE WHEN @no <> 10 THEN @created END);
        IF @no = 9
            INSERT Refunds (Id, PaymentAttemptId, RequestedByUserId, OperationKey, AmountVnd, Status, Reason, CreatedAtUtc, CompletedAtUtc)
            VALUES (NEWID(), @attempt, @manager, NEWID(), @price * @quantity + 30000, 'Succeeded', N'Hoàn tiền thử nghiệm cho đơn đã hủy', @created, @now);
        IF @no IN (8, 12)
            INSERT DefectReports (Id, OrderId, UserId, ClientRequestId, Reason, Status, CreatedAtUtc)
            VALUES (NEWID(), @order, @customer, NEWID(), N'[Demo] Bề mặt mô hình cần kiểm tra sau giao hàng', 'Open', @now);
    END;
    SET @no += 1;
END;
COMMIT TRANSACTION;
SELECT COUNT(*) AS DemoOrders FROM Orders WHERE OrderCode LIKE 'TB-DEMO-MGR-%';
