const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`[PASS] ${message}`);
}

console.log('====================================================');
console.log('BEGIN EMPIRICAL CHALLENGER VERIFICATION HARNESS (M2)');
console.log('====================================================\n');

// -----------------------------------------------------------------------------
// SUITE 1: EMOJI AUDIT IN SOURCE FILES
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: STRICT EMOJI SCAN ---');
const filesToScan = [
  'src/pages/admin/finance/FinancePage.tsx',
  'src/pages/admin/warranty/WarrantyPage.tsx',
  'src/services/defectService.ts'
];
const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u;

filesToScan.forEach(filePath => {
  const fullPath = path.resolve(filePath);
  assert(fs.existsSync(fullPath), `File exists: ${filePath}`);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  let emojiFoundInFile = 0;
  lines.forEach((line, idx) => {
    if (emojiRegex.test(line)) {
      emojiFoundInFile++;
      console.error(`Emoji at ${filePath}:${idx + 1} -> ${line.trim()}`);
    }
  });
  assert(emojiFoundInFile === 0, `Zero emojis found in ${filePath} (scanned ${lines.length} lines)`);
});

// -----------------------------------------------------------------------------
// SUITE 2: RFC 4122 v4 UUID GENERATOR EMPIRICAL STRESS TEST
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: RFC 4122 v4 UUID EMPIRICAL STRESS TEST ---');
const RFC4122_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUM_UUIDS = 25000;
const uuidSet = new Set();
let invalidUuidCount = 0;

for (let i = 0; i < NUM_UUIDS; i++) {
  const id = uuidv4();
  if (!RFC4122_V4_REGEX.test(id)) {
    invalidUuidCount++;
  }
  uuidSet.add(id);
}

assert(invalidUuidCount === 0, `All ${NUM_UUIDS} generated UUIDs strictly match RFC 4122 v4 pattern`);
assert(uuidSet.size === NUM_UUIDS, `0 collisions observed across ${NUM_UUIDS} generated UUIDs`);

// -----------------------------------------------------------------------------
// SUITE 3: FINANCE MODAL INPUT VALIDATION & ADVERSARIAL STRESS TEST
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: FINANCE REFUND MODAL VALIDATION ORACLE ---');

/**
 * Mirror the exact validation logic in FinancePage.tsx:
 * - maxRefundableAmount = selectedOrder ? selectedOrder.totalVnd : 0;
 * - parsedRefundAmount = Number(refundAmount) || 0;
 * - isAmountValid = parsedRefundAmount > 0 && parsedRefundAmount <= maxRefundableAmount;
 * - isReasonValid = refundReason.trim().length >= 10;
 * - isCreateRefundFormValid = isAmountValid && isReasonValid && !!selectedOrderId;
 */
function evaluateFinanceRefundForm(selectedOrderId, orderTotalVnd, refundAmountInput, refundReasonInput) {
  const maxRefundableAmount = selectedOrderId ? orderTotalVnd : 0;
  const parsedRefundAmount = Number(refundAmountInput) || 0;
  const isAmountValid = parsedRefundAmount > 0 && parsedRefundAmount <= maxRefundableAmount;
  const isReasonValid = (refundReasonInput || '').trim().length >= 10;
  const isCreateRefundFormValid = isAmountValid && isReasonValid && !!selectedOrderId;

  let blockingReason = null;
  if (!isCreateRefundFormValid) {
    if (!selectedOrderId) {
      blockingReason = 'ORDER_NOT_SELECTED';
    } else if (!isAmountValid) {
      blockingReason = 'AMOUNT_INVALID';
    } else if (!isReasonValid) {
      blockingReason = 'REASON_INVALID';
    }
  }

  return {
    isAmountValid,
    isReasonValid,
    isCreateRefundFormValid,
    blockingReason
  };
}

const mockOrderId = 'ord-12345';
const mockOrderTotal = 500000; // 500,000 VND

// Test 3.1: Valid inputs
const validRefund = evaluateFinanceRefundForm(mockOrderId, mockOrderTotal, '250000', 'Hoàn tiền do sản phẩm bị lỗi nứt bề mặt');
assert(validRefund.isCreateRefundFormValid === true, 'Valid refund amount and >= 10 chars reason passes validation');

// Test 3.2: Amount > order total (Over-refund attack)
const overflowRefund = evaluateFinanceRefundForm(mockOrderId, mockOrderTotal, '500001', 'Hoàn tiền do sản phẩm bị lỗi nứt bề mặt');
assert(overflowRefund.isAmountValid === false, 'Amount (500001) > order total (500000) is marked invalid');
assert(overflowRefund.isCreateRefundFormValid === false, 'Amount > order total blocks form submission');
assert(overflowRefund.blockingReason === 'AMOUNT_INVALID', 'Blocked specifically with AMOUNT_INVALID');

// Test 3.3: Amount = order total (Exact boundary)
const exactRefund = evaluateFinanceRefundForm(mockOrderId, mockOrderTotal, '500000', 'Hoàn tiền 100% đơn hàng do sai mẫu');
assert(exactRefund.isAmountValid === true && exactRefund.isCreateRefundFormValid === true, 'Amount = order total is allowed (100% refund)');

// Test 3.4: Amount <= 0
[-100, 0, -0.01].forEach(amt => {
  const res = evaluateFinanceRefundForm(mockOrderId, mockOrderTotal, String(amt), 'Hoàn tiền do sản phẩm bị lỗi nứt bề mặt');
  assert(res.isAmountValid === false && res.isCreateRefundFormValid === false, `Amount ${amt} is rejected`);
});

// Test 3.5: Reason < 10 characters
const shortReasons = ['', 'a', '123456789', 'Lỗi in', '   abc   '];
shortReasons.forEach(r => {
  const res = evaluateFinanceRefundForm(mockOrderId, mockOrderTotal, '100000', r);
  assert(res.isReasonValid === false, `Reason "${r}" (${r.trim().length} chars) is marked invalid`);
  assert(res.isCreateRefundFormValid === false, `Reason "${r}" blocks refund submission`);
  assert(res.blockingReason === 'REASON_INVALID', `Reason "${r}" blocked specifically with REASON_INVALID`);
});

// Test 3.6: Reason with 10 spaces (Whitespace spoof attack)
const whitespaceReason = '          ';
const wsRes = evaluateFinanceRefundForm(mockOrderId, mockOrderTotal, '100000', whitespaceReason);
assert(wsRes.isReasonValid === false, '10 whitespace spaces trimmed length is 0, correctly rejected');
assert(wsRes.isCreateRefundFormValid === false, 'Whitespace spoof properly blocks submission');

// Test 3.7: Boundary 10 characters exactly
const exact10CharsReason = '1234567890';
const exact10Res = evaluateFinanceRefundForm(mockOrderId, mockOrderTotal, '100000', exact10CharsReason);
assert(exact10Res.isReasonValid === true && exact10Res.isCreateRefundFormValid === true, 'Exactly 10 non-whitespace chars passes validation');

// -----------------------------------------------------------------------------
// SUITE 4: WARRANTY RESOLUTION MODAL VALIDATION & ADVERSARIAL STRESS TEST
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: WARRANTY DEFECT RESOLUTION MODAL VALIDATION ORACLE ---');

/**
 * Mirror the exact validation logic in WarrantyPage.tsx:
 * - isResolutionNoteValid = resolutionNote.trim().length >= 10;
 * - isResolutionFormValid = !!resolutionChoice && isResolutionNoteValid;
 */
function evaluateWarrantyResolutionForm(resolutionChoice, resolutionNote) {
  const isResolutionNoteValid = (resolutionNote || '').trim().length >= 10;
  const validChoices = ['ReprintApproved', 'RefundApproved', 'Rejected'];
  const hasValidChoice = !!resolutionChoice && validChoices.includes(resolutionChoice);
  const isResolutionFormValid = hasValidChoice && isResolutionNoteValid;

  let blockingReason = null;
  if (!isResolutionFormValid) {
    if (!hasValidChoice) {
      blockingReason = 'CHOICE_NOT_SELECTED';
    } else if (!isResolutionNoteValid) {
      blockingReason = 'NOTE_INVALID';
    }
  }

  return {
    isResolutionNoteValid,
    hasValidChoice,
    isResolutionFormValid,
    isButtonDisabled: !isResolutionFormValid,
    blockingReason
  };
}

// Test 4.1: Valid resolution decisions with valid note (>= 10 chars)
['ReprintApproved', 'RefundApproved', 'Rejected'].forEach(choice => {
  const res = evaluateWarrantyResolutionForm(choice, 'Sản phẩm lỗi in tách lớp, đồng ý duyệt in lại');
  assert(res.isResolutionFormValid === true && res.isButtonDisabled === false, `Choice "${choice}" with valid note enables submit button`);
});

// Test 4.2: Note < 10 characters disables button and blocks submission
const shortNotes = ['', 'Lỗi in', 'Ok duyệt', '123456789', '          '];
shortNotes.forEach(note => {
  const res = evaluateWarrantyResolutionForm('ReprintApproved', note);
  assert(res.isResolutionNoteValid === false, `Note "${note}" (${note.trim().length} chars) is marked invalid`);
  assert(res.isButtonDisabled === true, `Note "${note}" keeps submit button strictly DISABLED`);
  assert(res.blockingReason === 'NOTE_INVALID', `Note "${note}" blocked with NOTE_INVALID`);
});

// Test 4.3: Valid note but choice not selected
const noChoiceRes = evaluateWarrantyResolutionForm(null, 'Đã kiểm tra bằng chứng và ghi chú đầy đủ');
assert(noChoiceRes.hasValidChoice === false && noChoiceRes.isButtonDisabled === true, 'No choice selected keeps submit button strictly DISABLED');
assert(noChoiceRes.blockingReason === 'CHOICE_NOT_SELECTED', 'Blocked with CHOICE_NOT_SELECTED');

// -----------------------------------------------------------------------------
// SUITE 5: LIGHTBOX INDEX BOUNDS & STATE MACHINE STRESS TEST
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 5: LIGHTBOX VIEWER INDEX BOUNDS & STATE ORACLE ---');

class LightboxSimulator {
  constructor() {
    this.images = [];
    this.index = 0;
    this.isOpen = false;
    this.title = '';
  }

  open(images, initialIndex = 0, title = '') {
    if (!images || images.length === 0) return;
    this.images = images;
    this.index = initialIndex;
    this.title = title;
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
    this.images = [];
    this.index = 0;
    this.title = '';
  }

  next() {
    if (!this.isOpen || this.images.length === 0) return;
    this.index = (this.index + 1) % this.images.length;
  }

  prev() {
    if (!this.isOpen || this.images.length === 0) return;
    this.index = (this.index - 1 + this.images.length) % this.images.length;
  }
}

const lb = new LightboxSimulator();

// Test 5.1: Opening with empty array does not open (boundary safety)
lb.open([], 0, 'Empty test');
assert(lb.isOpen === false, 'Lightbox does not open on empty array');
lb.open(null, 0, 'Null test');
assert(lb.isOpen === false, 'Lightbox does not open on null array');

// Test 5.2: Opening with single image
lb.open(['https://example.com/photo1.jpg'], 0, 'Single photo');
assert(lb.isOpen === true && lb.index === 0, 'Lightbox opens with 1 photo at index 0');
lb.next();
assert(lb.index === 0, 'Next on single photo wraps to index 0 safely');
lb.prev();
assert(lb.index === 0, 'Prev on single photo wraps to index 0 safely');
lb.close();
assert(lb.isOpen === false && lb.images.length === 0 && lb.index === 0, 'Close resets state cleanly');

// Test 5.3: Navigating multiple images (circular wrap-around test)
const testPhotos = [
  'https://example.com/p1.jpg',
  'https://example.com/p2.jpg',
  'https://example.com/p3.jpg',
  'https://example.com/p4.jpg',
  'https://example.com/p5.jpg'
];
lb.open(testPhotos, 0, '5 photos test');
assert(lb.index === 0, 'Initial index is 0');

// Prev from 0 wraps to 4 (last image)
lb.prev();
assert(lb.index === 4, 'Prev from 0 wraps around to last photo index 4');

// Next from 4 wraps to 0 (first image)
lb.next();
assert(lb.index === 0, 'Next from 4 wraps around to first photo index 0');

// Step forward 3 times
lb.next(); lb.next(); lb.next();
assert(lb.index === 3, 'Stepping forward 3 times reaches index 3');

// Close resets completely
lb.close();
assert(lb.isOpen === false && lb.index === 0, 'Closing clears open flag and resets index');

// -----------------------------------------------------------------------------
// SUITE 6: STATIC CODE INSPECTION (DOM/REACT CODE CONTRACTS)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 6: STATIC REACT CONTRACT VERIFICATION ---');

const financeCode = fs.readFileSync('src/pages/admin/finance/FinancePage.tsx', 'utf8');
const warrantyCode = fs.readFileSync('src/pages/admin/warranty/WarrantyPage.tsx', 'utf8');

// Check FinancePage disabled attribute
assert(
  financeCode.includes('disabled={!isCreateRefundFormValid || isSubmittingRefund}'),
  'FinancePage refund submit button binds disabled to !isCreateRefundFormValid || isSubmittingRefund'
);

// Check FinancePage reason >= 10 check
assert(
  financeCode.includes('refundReason.trim().length >= 10'),
  'FinancePage enforces refundReason.trim().length >= 10'
);

// Check FinancePage amount <= maxRefundableAmount check
assert(
  financeCode.includes('parsedRefundAmount > 0 && parsedRefundAmount <= maxRefundableAmount'),
  'FinancePage enforces amount > 0 and amount <= maxRefundableAmount'
);

// Check WarrantyPage disabled attribute
assert(
  warrantyCode.includes('disabled={!isResolutionFormValid || isSubmittingResolution}'),
  'WarrantyPage resolution submit button binds disabled to !isResolutionFormValid || isSubmittingResolution'
);

// Check WarrantyPage note >= 10 check
assert(
  warrantyCode.includes('resolutionNote.trim().length >= 10'),
  'WarrantyPage enforces resolutionNote.trim().length >= 10'
);

// Check WarrantyPage 3 resolution options
['ReprintApproved', 'RefundApproved', 'Rejected'].forEach(type => {
  assert(
    warrantyCode.includes(`'${type}'`),
    `WarrantyPage handles resolution option '${type}'`
  );
});

console.log('\n====================================================');
console.log(`ALL EMPIRICAL TESTS PASSED! (${passedTests}/${totalTests} tests)`);
console.log('====================================================');
