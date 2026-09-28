// ═══════════════════════════════════════════════════════════
//  MEW (Mithra Engineering Works) — Universal Voice AI Brain
//  100% Voice-First Workshop Operating System with Multi-Turn AI Wizard
//  Covers ALL modules: Customers, Bore Rigs, Employees, Stocks, Suppliers, Reports, Money
//  Supports Tamil + Tanglish + English + Natural Multi-Turn Dialog
// ═══════════════════════════════════════════════════════════

import {
  getAllCustomers, getAllVehicles, getAllWorkers, getAllSuppliers, getAllParts,
  getAllExpenses, getAllPayments, getAllJobs, getSetting,
  saveCustomer, updateCustomer, saveVehicle, saveWorker, updateWorker, saveSupplier, updateSupplier, paySupplier,
  savePart, updatePart, adjustStock,
  saveExpense, markAttendance, saveAdvance, recordPayment,
  Customer, Vehicle, Worker, Supplier, Part, PaymentMethod, ExpenseCategory
} from './db';
import { callGemini, resolveGeminiKey } from './gemini';

// ═══════════════════════════════════════════════════════════
//  PARSED INTENT TYPES
// ═══════════════════════════════════════════════════════════

export type ParsedIntent =
  | {
      type: 'add_customer';
      name: string;
      phone: string;
      address?: string;
      whatsapp?: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'add_vehicle';
      customerId?: string;
      customerName: string;
      regNo: string;
      rigType?: string;
      make?: string;
      model?: string;
      compressorDetails?: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'add_worker';
      name: string;
      role: 'mechanic' | 'helper' | 'electrician' | 'lathe_operator' | 'welder' | 'driver' | 'manager';
      phone?: string;
      salary: number;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'add_supplier';
      name: string;
      phone?: string;
      address?: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'add_part';
      name: string;
      sku: string;
      stock: number;
      purchasePrice: number;
      sellingPrice: number;
      category: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'customer_advance';
      customerId?: string;
      customerName: string;
      vehicleId?: string;
      vehicleRegNo?: string;
      amount: number;
      method: string;
      note: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'vehicle_expense';
      customerId?: string;
      customerName?: string;
      vehicleId?: string;
      vehicleRegNo?: string;
      expenseType: string;
      amount: number;
      description: string;
      vendorNote: string;
      method: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'worker_attendance';
      workerId?: string;
      workerName: string;
      status: 'present' | 'absent' | 'half_day';
      date: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'worker_advance';
      workerId?: string;
      workerName: string;
      amount: number;
      actionType: 'advance' | 'bonus';
      note: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'supplier_payment';
      supplierId?: string;
      supplierName: string;
      amount: number;
      method: string;
      note: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'general_expense';
      category: string;
      amount: number;
      description: string;
      method: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
      tamilSummary: string;
      englishSummary: string;
    }
  | {
      type: 'query';
      question: string;
      answer?: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
    }
  | {
      type: 'unknown';
      raw: string;
      needsClarification?: boolean;
      clarifyField?: string;
      clarifyPromptTamil?: string;
      clarifyPromptEnglish?: string;
    };

// ═══════════════════════════════════════════════════════════
//  MULTI-TURN WIZARD TYPES & FLOW DEFINITIONS
// ═══════════════════════════════════════════════════════════

export type WizardFlowType =
  | 'add_customer'
  | 'customer_advance'
  | 'vehicle_expense'
  | 'general_expense'
  | 'add_worker'
  | 'worker_attendance'
  | 'worker_advance'
  | 'add_vehicle'
  | 'add_supplier'
  | 'supplier_payment'
  | 'add_part';

export interface WizardQuestion {
  field: string;
  questionTamil: string;
  questionEnglish: string;
  phoneticTanglish: string;
  chips: string[];
}

export interface WizardSession {
  flow: WizardFlowType;
  titleTamil: string;
  titleEnglish: string;
  stepIndex: number;
  data: Record<string, any>;
  isComplete: boolean;
  finalIntent?: ParsedIntent;
  currentQuestionTamil: string;
  currentQuestionEnglish: string;
  currentQuestionPhonetic: string;
  chips: string[];
}

export const WIZARD_FLOW_DEFINITIONS: Record<WizardFlowType, {
  titleTamil: string;
  titleEnglish: string;
  questions: WizardQuestion[];
}> = {
  add_customer: {
    titleTamil: 'புதிய வாடிக்கையாளர் சேர்த்தல்',
    titleEnglish: 'Add New Customer',
    questions: [
      {
        field: 'name',
        questionTamil: 'வாடிக்கையாளர் பெயர் என்ன? (உதாரணம்: பாலாஜி அல்லது ராஜா)',
        questionEnglish: 'What is the customer name? (e.g., Balaji or Raja)',
        phoneticTanglish: 'Customer name enna? Sollunga.',
        chips: ['Balaji', 'Rajan', 'Muthu', 'Siva Kumar', 'Murugan'],
      },
      {
        field: 'phone',
        questionTamil: 'அவர்களின் போன் நம்பர் சொல்லுங்க? (உதாரணம்: 9845123456)',
        questionEnglish: 'What is their phone number? (e.g., 9845123456)',
        phoneticTanglish: 'Avanga phone number sollunga?',
        chips: ['9845123456', '9876543210', '9443210987'],
      },
      {
        field: 'address',
        questionTamil: 'ஊர் அல்லது முகவரி என்ன? (உதாரணம்: நாமக்கல் அல்லது சேலம்)',
        questionEnglish: 'Which city or address? (e.g., Namakkal, Salem, Erode)',
        phoneticTanglish: 'Oor illa address enna?',
        chips: ['Namakkal', 'Salem', 'Tiruchengode', 'Erode', 'Chennai'],
      },
    ],
  },
  customer_advance: {
    titleTamil: 'வாடிக்கையாளர் அட்வான்ஸ் வரவு',
    titleEnglish: 'Customer Advance (Money In)',
    questions: [
      {
        field: 'customerName',
        questionTamil: 'எந்த வாடிக்கையாளர் அட்வான்ஸ் கொடுத்தார்? பெயர் சொல்லுங்க.',
        questionEnglish: 'Which customer gave this advance? Please say their name.',
        phoneticTanglish: 'Endha customer advance kodutharu? Name sollunga.',
        chips: ['Balaji', 'Raj Kumar', 'Muthu Selvam', 'Siva'],
      },
      {
        field: 'amount',
        questionTamil: 'அட்வான்ஸ் தொகை எவ்வளவு? (உதாரணம்: 50,000)',
        questionEnglish: 'How much is the advance amount? (e.g., 50,000 or 25,000)',
        phoneticTanglish: 'Advance amount evlo rupees? Sollunga.',
        chips: ['₹10,000', '₹25,000', '₹50,000', '₹1,00,000'],
      },
      {
        field: 'method',
        questionTamil: 'பணம் எப்படி வந்தது? Cash, GPay, அல்லது Bank transfer?',
        questionEnglish: 'Payment mode: Cash, GPay / UPI, or Bank transfer?',
        phoneticTanglish: 'Panam epdi vandhuchu? Cash, GPay, illa Bank transfer?',
        chips: ['GPay / UPI', 'Cash', 'Bank Transfer', 'Cheque'],
      },
    ],
  },
  vehicle_expense: {
    titleTamil: 'வாகன / பட்டறை செலவு பதிவு',
    titleEnglish: 'Record Workshop / Vehicle Expense',
    questions: [
      {
        field: 'expenseType',
        questionTamil: 'இது என்ன செலவு? லேத் டர்னிங், வெல்டிங், ஹோஸ், டீசல், அல்லது மற்ற செலவா?',
        questionEnglish: 'What type of expense? Lathe work, Welding, Hose, Diesel, or Spares?',
        phoneticTanglish: 'Idhu enna selavu? Lathe, Welding, Hose, Diesel illa general selava?',
        chips: ['Lathe Turning', 'Welding', 'Hydraulic Hose', 'Diesel', 'Hardware'],
      },
      {
        field: 'amount',
        questionTamil: 'செலவு தொகை எவ்வளவு? (உதாரணம்: 4,500 அல்லது 1,200)',
        questionEnglish: 'What is the expense amount? (e.g., 4,500 or 1,200)',
        phoneticTanglish: 'Selavu amount evlo? Sollunga.',
        chips: ['₹500', '₹1,200', '₹2,500', '₹4,500', '₹10,000'],
      },
      {
        field: 'description',
        questionTamil: 'யாருக்கு அல்லது என்ன வேலைக்காக கொடுத்தீங்க? விவரம் சொல்லுங்க.',
        questionEnglish: 'What is the job detail or vendor note?',
        phoneticTanglish: 'Enna velaikku illa yaarkku kodutheenga? Detail sollunga.',
        chips: ['Rod turning work', 'Welding fabrication', 'Hose crimping', 'Rig diesel fuel'],
      },
      {
        field: 'method',
        questionTamil: 'பணம் எப்படி கொடுத்தீங்க? Cash அல்லது GPay?',
        questionEnglish: 'Payment method: Cash or GPay / UPI?',
        phoneticTanglish: 'Panam epdi kodutheenga? Cash illa GPay?',
        chips: ['Cash', 'GPay / UPI', 'Bank Transfer'],
      },
    ],
  },
  general_expense: {
    titleTamil: 'பொது பட்டறை செலவு',
    titleEnglish: 'General Workshop Expense',
    questions: [
      {
        field: 'category',
        questionTamil: 'என்ன செலவு? வாடகை, கரண்ட் பில் (EB), டீ/சாப்பாடு, அல்லது மற்ற செலவா?',
        questionEnglish: 'What expense? Rent, EB electricity, Tea / Snacks, or General?',
        phoneticTanglish: 'Enna selavu? Rent, EB bill, Tea snacks, illa general selava?',
        chips: ['Tea & Snacks', 'Electricity (EB)', 'Workshop Rent', 'Hardware Spares'],
      },
      {
        field: 'amount',
        questionTamil: 'செலவு தொகை எவ்வளவு? (உதாரணம்: 150 அல்லது 5,000)',
        questionEnglish: 'What is the expense amount?',
        phoneticTanglish: 'Amount evlo rupees? Sollunga.',
        chips: ['₹150', '₹500', '₹1,500', '₹5,000'],
      },
    ],
  },
  add_worker: {
    titleTamil: 'புதிய பணியாளர் சேர்த்தல்',
    titleEnglish: 'Add New Employee / Worker',
    questions: [
      {
        field: 'name',
        questionTamil: 'பணியாளர் பெயர் என்ன? (உதாரணம்: முருகன் அல்லது குமார்)',
        questionEnglish: 'What is the worker name? (e.g., Murugan or Kumar)',
        phoneticTanglish: 'Worker name enna? Sollunga.',
        chips: ['Murugan', 'Kumar', 'Ramesh', 'Senthil', 'Anbu'],
      },
      {
        field: 'role',
        questionTamil: 'அவர்களின் வேலை என்ன? Mechanic, Welder, Helper, Lathe operator, அல்லது Driver?',
        questionEnglish: 'What is their role? Mechanic, Welder, Helper, Lathe operator, or Driver?',
        phoneticTanglish: 'Role enna? Mechanic, Welder, Helper, Lathe operator, illa Driver?',
        chips: ['Mechanic', 'Helper', 'Welder', 'Lathe Operator', 'Driver'],
      },
      {
        field: 'salary',
        questionTamil: 'மாத சம்பளம் எவ்வளவு? (உதாரணம்: 18,000 அல்லது 15,000)',
        questionEnglish: 'What is their monthly salary? (e.g., 18,000 or 15,000)',
        phoneticTanglish: 'Monthly salary evlo? Sollunga.',
        chips: ['₹12,000', '₹15,000', '₹18,000', '₹22,000', '₹25,000'],
      },
      {
        field: 'phone',
        questionTamil: 'அவர்களின் போன் நம்பர் சொல்லுங்க?',
        questionEnglish: 'What is their phone number?',
        phoneticTanglish: 'Phone number sollunga?',
        chips: ['9845112233', '9876543210'],
      },
    ],
  },
  worker_attendance: {
    titleTamil: 'பணியாளர் வருகை பதிவு',
    titleEnglish: 'Worker Attendance Entry',
    questions: [
      {
        field: 'workerName',
        questionTamil: 'எந்த பணியாளரின் வருகை பதிவு செய்யணும்? பெயர் சொல்லுங்க.',
        questionEnglish: 'Which worker attendance to mark? Please say their name.',
        phoneticTanglish: 'Endha worker attendance record pannanum? Name sollunga.',
        chips: ['Ramesh', 'Senthil', 'Murugan', 'Kumar', 'Anbu'],
      },
      {
        field: 'status',
        questionTamil: 'இன்று Present (வந்தார்), Absent (விடுமுறை), அல்லது Half-day (அரை நாள்)?',
        questionEnglish: 'Status for today: Present, Absent, or Half-day?',
        phoneticTanglish: 'Innaiku Present, Absent, illa Half-day?',
        chips: ['Present (வருகை)', 'Absent (விடுமுறை)', 'Half-Day (அரை நாள்)'],
      },
    ],
  },
  worker_advance: {
    titleTamil: 'பணியாளர் சம்பள அட்வான்ஸ் / போனஸ்',
    titleEnglish: 'Worker Salary Advance / Bonus',
    questions: [
      {
        field: 'workerName',
        questionTamil: 'எந்த பணியாளருக்கு கொடுக்கப்பட்டது? பெயர் சொல்லுங்க.',
        questionEnglish: 'Which worker received the payment? Please say their name.',
        phoneticTanglish: 'Endha worker ku kodutheenga? Name sollunga.',
        chips: ['Ramesh', 'Senthil', 'Murugan', 'Kumar'],
      },
      {
        field: 'amount',
        questionTamil: 'கொடுத்த தொகை எவ்வளவு? (உதாரணம்: 2,000)',
        questionEnglish: 'How much was given? (e.g., 2,000 or 5,000)',
        phoneticTanglish: 'Amount evlo kodutheenga? Sollunga.',
        chips: ['₹500', '₹1,000', '₹2,000', '₹5,000'],
      },
      {
        field: 'actionType',
        questionTamil: 'இது சம்பள அட்வான்ஸா அல்லது போனஸா?',
        questionEnglish: 'Is this a Salary Advance or a Festival Bonus?',
        phoneticTanglish: 'Idhu salary advance-aa illa bonus-aa?',
        chips: ['Salary Advance', 'Bonus'],
      },
    ],
  },
  add_vehicle: {
    titleTamil: 'புதிய போர் வண்டி சேர்த்தல்',
    titleEnglish: 'Add Bore Rig Vehicle',
    questions: [
      {
        field: 'customerName',
        questionTamil: 'எந்த வாடிக்கையாளரின் வண்டி? பெயர் சொல்லுங்க.',
        questionEnglish: 'Which customer does this vehicle belong to? Please say name.',
        phoneticTanglish: 'Endha customer oda vandi? Name sollunga.',
        chips: ['Balaji', 'Raj Kumar', 'Muthu Selvam'],
      },
      {
        field: 'regNo',
        questionTamil: 'வண்டி நம்பர் என்ன? (உதாரணம்: TN 28 AB 1234)',
        questionEnglish: 'What is the vehicle registration number? (e.g., TN 28 AB 1234)',
        phoneticTanglish: 'Vehicle registration number enna?',
        chips: ['TN 28 AB 1234', 'TN 28 BR 9999', 'TN 30 XY 5555'],
      },
      {
        field: 'rigType',
        questionTamil: 'வண்டி வகை என்ன? DTH Rig, Direct Rotary, அல்லது Tractor Rig?',
        questionEnglish: 'Rig type: DTH Rig, Direct Rotary, or Tractor Rig?',
        phoneticTanglish: 'Rig type enna? DTH Rig, Direct Rotary, illa Tractor Rig?',
        chips: ['DTH Rig', 'Direct Rotary', 'Tractor Rig', 'Super Rig'],
      },
    ],
  },
  add_supplier: {
    titleTamil: 'புதிய சப்ளையர் சேர்த்தல்',
    titleEnglish: 'Add New Supplier',
    questions: [
      {
        field: 'name',
        questionTamil: 'சப்ளையர் அல்லது கடை பெயர் என்ன? (உதாரணம்: ஸ்ரீ பாலாஜி ஸ்பேர்ஸ்)',
        questionEnglish: 'What is the supplier / shop name?',
        phoneticTanglish: 'Supplier illa shop name enna? Sollunga.',
        chips: ['Sri Balaji Spares', 'Kumar Auto Parts', 'ELGi Genuine Spares'],
      },
      {
        field: 'phone',
        questionTamil: 'அவர்களின் போன் நம்பர் சொல்லுங்க?',
        questionEnglish: 'What is their phone number?',
        phoneticTanglish: 'Phone number sollunga?',
        chips: ['9876543210', '9845112233'],
      },
      {
        field: 'address',
        questionTamil: 'ஊர் என்ன? (உதாரணம்: சேலம் அல்லது சென்னை)',
        questionEnglish: 'Which city? (e.g., Salem, Coimbatore, Chennai)',
        phoneticTanglish: 'City enna?',
        chips: ['Salem', 'Coimbatore', 'Chennai', 'Namakkal'],
      },
    ],
  },
  supplier_payment: {
    titleTamil: 'சப்ளையர் பேமெண்ட் பதிவு',
    titleEnglish: 'Supplier Payment Entry',
    questions: [
      {
        field: 'supplierName',
        questionTamil: 'எந்த சப்ளையருக்கு பணம் கொடுத்தீங்க? பெயர் சொல்லுங்க.',
        questionEnglish: 'Which supplier did you pay? Please say name.',
        phoneticTanglish: 'Endha supplier ku pay panneenga? Name sollunga.',
        chips: ['Sri Balaji Spares', 'Kumar Auto Parts', 'ELGi Spares'],
      },
      {
        field: 'amount',
        questionTamil: 'கொடுத்த தொகை எவ்வளவு? (உதாரணம்: 15,000)',
        questionEnglish: 'What is the payment amount? (e.g., 15,000)',
        phoneticTanglish: 'Amount evlo rupees? Sollunga.',
        chips: ['₹5,000', '₹10,000', '₹15,000', '₹25,000'],
      },
      {
        field: 'method',
        questionTamil: 'பணம் எப்படி கொடுத்தீங்க? GPay, Bank transfer, அல்லது Cash?',
        questionEnglish: 'Payment mode: GPay / UPI, Bank transfer, or Cash?',
        phoneticTanglish: 'Panam epdi kodutheenga? GPay, Bank transfer, illa Cash?',
        chips: ['GPay / UPI', 'Bank Transfer', 'Cash', 'Cheque'],
      },
    ],
  },
  add_part: {
    titleTamil: 'ஸ்பேர் பார்ட் / ஆயில் ஸ்டாக் சேர்த்தல்',
    titleEnglish: 'Add Spare Part / Stock',
    questions: [
      {
        field: 'name',
        questionTamil: 'பாகம் அல்லது ஆயில் பெயர் என்ன? (உதாரணம்: என்ஜின் ஆயில் 15W-40 அல்லது ஆயில் ஃபில்டர்)',
        questionEnglish: 'What is the spare part or oil name?',
        phoneticTanglish: 'Part illa oil name enna? Sollunga.',
        chips: ['Engine Oil 15W-40', 'Hydraulic Oil 68', 'Oil Filter', 'Hammer Button Bit'],
      },
      {
        field: 'stock',
        questionTamil: 'எவ்வளவு எண்ணிக்கை/அளவு சேர்க்கணும்? (உதாரணம்: 10 அல்லது 20)',
        questionEnglish: 'What is the quantity to add? (e.g., 10 or 20)',
        phoneticTanglish: 'Quantity evlo serkkanum? Sollunga.',
        chips: ['5', '10', '20', '50'],
      },
      {
        field: 'purchasePrice',
        questionTamil: 'வாங்கிய விலை எவ்வளவு? (உதாரணம்: 450 அல்லது 3,200)',
        questionEnglish: 'What is the purchase cost per unit? (e.g., 450)',
        phoneticTanglish: 'Purchase price evlo? Sollunga.',
        chips: ['₹350', '₹450', '₹1,200', '₹3,500'],
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
//  WIZARD SESSION FACTORY & STEP CONTROLLER
// ═══════════════════════════════════════════════════════════

export function startWizardSession(flow: WizardFlowType, initialData: Record<string, any> = {}): WizardSession {
  const def = WIZARD_FLOW_DEFINITIONS[flow];
  const questions = def.questions;

  // Find the first missing question
  let stepIndex = 0;
  for (let i = 0; i < questions.length; i++) {
    const f = questions[i].field;
    if (initialData[f] === undefined || initialData[f] === null || initialData[f] === '') {
      stepIndex = i;
      break;
    }
    if (i === questions.length - 1) {
      stepIndex = questions.length; // all complete!
    }
  }

  const isComplete = stepIndex >= questions.length;
  const currentQ = isComplete ? questions[questions.length - 1] : questions[stepIndex];

  const session: WizardSession = {
    flow,
    titleTamil: def.titleTamil,
    titleEnglish: def.titleEnglish,
    stepIndex,
    data: { ...initialData },
    isComplete,
    currentQuestionTamil: isComplete ? 'விவரங்கள் தயாராக உள்ளன. உறுதி செய்து சேமிக்கவா?' : currentQ.questionTamil,
    currentQuestionEnglish: isComplete ? 'Details ready. Confirm and save?' : currentQ.questionEnglish,
    currentQuestionPhonetic: isComplete ? 'Details ready. Confirm pannava?' : currentQ.phoneticTanglish,
    chips: isComplete ? ['✅ Confirm & Save', '❌ Cancel'] : currentQ.chips,
  };

  if (isComplete) {
    session.finalIntent = convertWizardDataToIntent(flow, session.data);
  }

  return session;
}

export function stepWizardSession(session: WizardSession, utterance: string): WizardSession {
  const def = WIZARD_FLOW_DEFINITIONS[session.flow];
  const questions = def.questions;
  const raw = utterance.trim();
  const lower = utterance.toLowerCase().trim();

  // If already complete and user says "confirm", "save", "yes", "aam", "sari"
  if (session.isComplete) {
    return session;
  }

  const currentQ = questions[session.stepIndex];
  const field = currentQ.field;
  const updatedData = { ...session.data };

  // Parse according to field type
  if (field === 'amount' || field === 'salary' || field === 'purchasePrice' || field === 'sellingPrice') {
    const amt = extractAmount(lower);
    if (amt > 0) {
      updatedData[field] = amt;
    } else {
      const digits = raw.replace(/[^0-9]/g, '');
      if (digits) updatedData[field] = parseInt(digits, 10);
      else updatedData[field] = 1000;
    }
  } else if (field === 'stock' || field === 'quantity') {
    const digits = raw.replace(/[^0-9]/g, '');
    updatedData[field] = digits ? parseInt(digits, 10) : 10;
  } else if (field === 'phone') {
    const ph = extractPhone(lower);
    updatedData[field] = ph || raw.replace(/[^0-9]/g, '').slice(0, 10) || '9845123456';
  } else if (field === 'regNo') {
    const reg = extractRegNo(raw);
    updatedData[field] = reg || raw.toUpperCase();
  } else if (field === 'method') {
    updatedData[field] = extractMethod(lower);
  } else if (field === 'status') {
    if (lower.includes('absent') || lower.includes('ஆப்சன்ட்') || lower.includes('லீவு') || lower.includes('விடுமுறை')) {
      updatedData[field] = 'absent';
    } else if (lower.includes('half') || lower.includes('ஹாப்')) {
      updatedData[field] = 'half_day';
    } else {
      updatedData[field] = 'present';
    }
  } else if (field === 'role') {
    if (lower.includes('helper') || lower.includes('ஹெல்ப்பர்')) updatedData[field] = 'helper';
    else if (lower.includes('welder') || lower.includes('வெல்டர்')) updatedData[field] = 'welder';
    else if (lower.includes('lathe') || lower.includes('லேத்')) updatedData[field] = 'lathe_operator';
    else if (lower.includes('driver') || lower.includes('டிரைவர்')) updatedData[field] = 'driver';
    else updatedData[field] = 'mechanic';
  } else if (field === 'actionType') {
    updatedData[field] = (lower.includes('bonus') || lower.includes('போனஸ்')) ? 'bonus' : 'advance';
  } else if (field === 'expenseType') {
    if (lower.includes('lathe') || lower.includes('லேத்')) updatedData[field] = 'lathe_work';
    else if (lower.includes('welding') || lower.includes('வெல்டிங்')) updatedData[field] = 'welding';
    else if (lower.includes('hose') || lower.includes('ஹோஸ்')) updatedData[field] = 'hydraulic_hose';
    else if (lower.includes('diesel') || lower.includes('டீசல்')) updatedData[field] = 'diesel_fuel';
    else updatedData[field] = 'other';
  } else {
    // Clean general text (names, address, description)
    let clean = raw
      .replace(/pudhu|new|customer|worker|advance|expense|selavu|name|பெயர்|வாடிக்கையாளர்|பணியாளர்|சப்ளையர்/gi, '')
      .replace(/^[,\s-]+|[,\s-]+$/g, '')
      .trim();
    if (!clean) clean = raw;
    updatedData[field] = clean;
  }

  // Advance to next step
  const nextStepIndex = session.stepIndex + 1;
  const isComplete = nextStepIndex >= questions.length;
  const nextQ = isComplete ? questions[questions.length - 1] : questions[nextStepIndex];

  const updatedSession: WizardSession = {
    flow: session.flow,
    titleTamil: def.titleTamil,
    titleEnglish: def.titleEnglish,
    stepIndex: nextStepIndex,
    data: updatedData,
    isComplete,
    currentQuestionTamil: isComplete
      ? 'விவரங்கள் பெறப்பட்டன. உறுதி செய்து சேமிக்கவா?'
      : nextQ.questionTamil,
    currentQuestionEnglish: isComplete
      ? 'Details collected. Confirm and save?'
      : nextQ.questionEnglish,
    currentQuestionPhonetic: isComplete
      ? 'Details ready. Confirm pannava?'
      : nextQ.phoneticTanglish,
    chips: isComplete ? ['✅ Confirm & Save', '❌ Cancel'] : nextQ.chips,
  };

  if (isComplete) {
    updatedSession.finalIntent = convertWizardDataToIntent(session.flow, updatedData);
  }

  return updatedSession;
}

export function convertWizardDataToIntent(flow: WizardFlowType, data: Record<string, any>): ParsedIntent {
  const todayStr = new Date().toISOString().split('T')[0];

  switch (flow) {
    case 'add_customer': {
      const name = data.name || 'Customer';
      const phone = data.phone || '9845123456';
      const address = data.address || '';
      return {
        type: 'add_customer',
        name,
        phone,
        address,
        whatsapp: phone,
        tamilSummary: `புதிய வாடிக்கையாளர்: ${name} (${phone}) ${address ? `• ${address}` : ''}`,
        englishSummary: `Add Customer: ${name} (${phone}) ${address ? `• ${address}` : ''}`,
      };
    }
    case 'customer_advance': {
      const name = data.customerName || 'Customer';
      const amount = data.amount || 10000;
      const method = data.method || 'cash';
      return {
        type: 'customer_advance',
        customerName: name,
        amount,
        method,
        note: `Advance from ${name} via ${method.toUpperCase()}`,
        tamilSummary: `${name} போர் வண்டிக்கு அட்வான்ஸ் ₹${amount.toLocaleString('en-IN')} (${method.toUpperCase()})`,
        englishSummary: `Receive ₹${amount.toLocaleString('en-IN')} Advance from ${name} via ${method.toUpperCase()}`,
      };
    }
    case 'vehicle_expense': {
      const expType = data.expenseType || 'lathe_work';
      const amount = data.amount || 1000;
      const desc = data.description || 'Workshop Expense';
      const method = data.method || 'cash';
      const typeLabel = expType === 'lathe_work' ? 'லேத் டர்னிங்' : expType === 'welding' ? 'வெல்டிங்' : expType === 'hydraulic_hose' ? 'ஹைட்ராலிக் ஹோஸ்' : expType === 'diesel_fuel' ? 'டீசல்' : 'பட்டறை நேரடி';
      return {
        type: 'vehicle_expense',
        expenseType: expType,
        amount,
        description: desc,
        vendorNote: desc,
        method,
        tamilSummary: `${typeLabel} செலவு ₹${amount.toLocaleString('en-IN')} (${desc})`,
        englishSummary: `Record ₹${amount.toLocaleString('en-IN')} for ${desc} (${method.toUpperCase()})`,
      };
    }
    case 'general_expense': {
      const cat = data.category || 'other';
      const amount = data.amount || 500;
      return {
        type: 'general_expense',
        category: cat,
        amount,
        description: `General workshop expense (${cat})`,
        method: 'cash',
        tamilSummary: `பொதுச் செலவு ₹${amount.toLocaleString('en-IN')} (${cat})`,
        englishSummary: `General Expense ₹${amount.toLocaleString('en-IN')} for ${cat}`,
      };
    }
    case 'add_worker': {
      const name = data.name || 'Worker';
      const role = data.role || 'mechanic';
      const salary = data.salary || 15000;
      const phone = data.phone || '';
      return {
        type: 'add_worker',
        name,
        role,
        salary,
        phone,
        tamilSummary: `புதிய பணியாளர்: ${name} (${role.toUpperCase()}, சம்பளம்: ₹${salary.toLocaleString('en-IN')})`,
        englishSummary: `Add Employee: ${name} (${role}, Salary: ₹${salary.toLocaleString('en-IN')})`,
      };
    }
    case 'worker_attendance': {
      const name = data.workerName || 'Worker';
      const status = data.status || 'present';
      const statusLabel = status === 'present' ? 'வருகை (Present)' : status === 'absent' ? 'விடுமுறை (Absent)' : 'அரை நாள் (Half-Day)';
      return {
        type: 'worker_attendance',
        workerName: name,
        status,
        date: todayStr,
        tamilSummary: `${name} இன்று ${statusLabel}`,
        englishSummary: `Mark ${name} as ${status.toUpperCase()} for today`,
      };
    }
    case 'worker_advance': {
      const name = data.workerName || 'Worker';
      const amount = data.amount || 1000;
      const actionType = data.actionType || 'advance';
      return {
        type: 'worker_advance',
        workerName: name,
        amount,
        actionType,
        note: `Given ${amount} ${actionType} to ${name}`,
        tamilSummary: `${name}க்கு ${actionType === 'bonus' ? 'போனஸ்' : 'சம்பள அட்வான்ஸ்'} ₹${amount.toLocaleString('en-IN')}`,
        englishSummary: `Record ₹${amount.toLocaleString('en-IN')} ${actionType} for ${name}`,
      };
    }
    case 'add_vehicle': {
      const cust = data.customerName || 'Customer';
      const regNo = data.regNo || 'TN 28 AB 1234';
      const rigType = data.rigType || 'DTH Rig';
      return {
        type: 'add_vehicle',
        customerName: cust,
        regNo,
        rigType,
        make: 'Ashok Leyland',
        model: 'PRD 1000',
        compressorDetails: 'ELGi 1100 CFM / 300 PSI',
        tamilSummary: `${cust}க்கு புதிய போர் வண்டி: ${regNo} (${rigType})`,
        englishSummary: `Add Rig ${regNo} (${rigType}) for ${cust}`,
      };
    }
    case 'add_supplier': {
      const name = data.name || 'Supplier';
      const phone = data.phone || '';
      const address = data.address || '';
      return {
        type: 'add_supplier',
        name,
        phone,
        address,
        tamilSummary: `புதிய சப்ளையர்: ${name} (${phone || 'போன் இல்லை'}) ${address ? `• ${address}` : ''}`,
        englishSummary: `Add Supplier: ${name} (${phone})`,
      };
    }
    case 'supplier_payment': {
      const name = data.supplierName || 'Supplier';
      const amount = data.amount || 5000;
      const method = data.method || 'upi';
      return {
        type: 'supplier_payment',
        supplierName: name,
        amount,
        method,
        note: `Paid ${amount} to ${name}`,
        tamilSummary: `${name}க்கு ₹${amount.toLocaleString('en-IN')} பேமெண்ட் (${method.toUpperCase()})`,
        englishSummary: `Pay ₹${amount.toLocaleString('en-IN')} to supplier ${name}`,
      };
    }
    case 'add_part': {
      const name = data.name || 'Spare Part';
      const qty = data.stock || 10;
      const price = data.purchasePrice || 500;
      return {
        type: 'add_part',
        name,
        sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
        stock: qty,
        purchasePrice: price,
        sellingPrice: Math.round(price * 1.3),
        category: 'Spares',
        tamilSummary: `ஸ்டாக் சேர்த்தல்: ${name} (${qty} அளவு, வாங்கிய விலை: ₹${price})`,
        englishSummary: `Add Part: ${name} (Qty: ${qty}, Cost: ₹${price})`,
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  TEXT EXTRACTION HELPERS
// ═══════════════════════════════════════════════════════════

const METHOD_KEYWORDS = [
  { keyword: 'upi', method: 'upi' },
  { keyword: 'gpay', method: 'upi' },
  { keyword: 'google pay', method: 'upi' },
  { keyword: 'phonepe', method: 'upi' },
  { keyword: 'phone pe', method: 'upi' },
  { keyword: 'paytm', method: 'upi' },
  { keyword: 'ஜிபே', method: 'upi' },
  { keyword: 'cash', method: 'cash' },
  { keyword: 'பணம்', method: 'cash' },
  { keyword: 'நேரடி', method: 'cash' },
  { keyword: 'கைல', method: 'cash' },
  { keyword: 'card', method: 'card' },
  { keyword: 'cheque', method: 'cheque' },
  { keyword: 'check', method: 'cheque' },
  { keyword: 'செக்', method: 'cheque' },
  { keyword: 'online', method: 'bank_transfer' },
  { keyword: 'bank', method: 'bank_transfer' },
  { keyword: 'neft', method: 'bank_transfer' },
  { keyword: 'rtgs', method: 'bank_transfer' },
  { keyword: 'பேங்க்', method: 'bank_transfer' },
];

export function extractAmount(text: string): number {
  const clean = text.replace(/,/g, '');
  const patterns = [
    /₹\s*([0-9]+(?:\.[0-9]+)?)/,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:rupees?|rs\.?|ரூபாய்|\/-)/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:k|thousand|ஆயிரம்)/i,
    /([0-9]+(?:\.[0-9]+)?)\s*(?:l|lakh|லட்சம்)/i,
    /([0-9]+(?:\.[0-9]+)?)/,
  ];

  for (const p of patterns) {
    const m = clean.match(p);
    if (m) {
      let val = parseFloat(m[1]);
      if (clean.match(/\d+\s*(?:k|thousand|ஆயிரம்)/i)) val *= 1000;
      if (clean.match(/\d+\s*(?:l|lakh|லட்சம்)/i)) val *= 100000;
      return val;
    }
  }
  return 0;
}

export function extractPhone(text: string): string | undefined {
  const m = text.match(/(?:phone|mobile|போன்|எண்|number)?\s*([6-9]\d{9})/i);
  if (m) return m[1];
  const digits = text.replace(/[^0-9]/g, '');
  if (digits.length >= 10) {
    const match = digits.match(/[6-9]\d{9}/);
    if (match) return match[0];
  }
  return undefined;
}

export function extractRegNo(text: string): string | undefined {
  const m = text.match(/([A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{0,3}[-\s]?[0-9]{4})/i);
  if (m) return m[1].toUpperCase().replace(/[-\s]+/g, ' ');
  return undefined;
}

export function extractMethod(text: string): string {
  const lower = text.toLowerCase();
  for (const { keyword, method } of METHOD_KEYWORDS) {
    if (lower.includes(keyword)) return method;
  }
  return 'cash';
}

// ═══════════════════════════════════════════════════════════
//  SMART PARSER: FULL INTENTS OR WIZARD TRIGGER
// ═══════════════════════════════════════════════════════════

export async function parseVoiceInputSmart(text: string, activeWizard?: WizardSession): Promise<{
  intent?: ParsedIntent;
  wizardSession?: WizardSession;
}> {
  const raw = text.trim();
  const lower = text.toLowerCase().trim();
  const amount = extractAmount(lower);
  const phone = extractPhone(lower);
  const regNo = extractRegNo(raw);
  const method = extractMethod(lower);

  // If a multi-turn session is active, advance the wizard with the spoken answer
  if (activeWizard && !activeWizard.isComplete) {
    const updated = stepWizardSession(activeWizard, text);
    if (updated.isComplete && updated.finalIntent) {
      return { intent: updated.finalIntent, wizardSession: updated };
    }
    return { wizardSession: updated };
  }

  // 1. Fetch DB entities for fuzzy matching
  const [customers, vehicles, workers, suppliers] = await Promise.all([
    getAllCustomers(),
    getAllVehicles(),
    getAllWorkers(),
    getAllSuppliers(),
  ]);

  // Match Customer
  let matchedCustomer: Customer | undefined;
  for (const c of customers) {
    const cName = c.name.toLowerCase();
    const words = cName.split(' ').filter(w => w.length > 2);
    if (lower.includes(cName) || words.some(w => lower.includes(w))) {
      matchedCustomer = c;
      break;
    }
  }

  // Match Worker
  let matchedWorker: Worker | undefined;
  for (const w of workers) {
    const wName = w.name.toLowerCase();
    const words = wName.split(' ').filter(word => word.length > 2);
    if (lower.includes(wName) || words.some(word => lower.includes(word))) {
      matchedWorker = w;
      break;
    }
  }

  // Match Supplier
  let matchedSupplier: Supplier | undefined;
  for (const s of suppliers) {
    const sName = s.name.toLowerCase();
    const words = sName.split(' ').filter(w => w.length > 2);
    if (lower.includes(sName) || words.some(w => lower.includes(w))) {
      matchedSupplier = s;
      break;
    }
  }

  // Match Vehicle
  let matchedVehicle: Vehicle | undefined;
  for (const v of vehicles) {
    const cleanReg = v.regNo.toLowerCase().replace(/\s+/g, '');
    const cleanLower = lower.replace(/\s+/g, '');
    if (cleanLower.includes(cleanReg) || (v.regNo.length >= 4 && cleanLower.includes(v.regNo.slice(-4).toLowerCase()))) {
      matchedVehicle = v;
      break;
    }
  }

  // ═════════════════════════════════════════════════════════
  //  FLOW 1: ADD NEW CUSTOMER
  // ═════════════════════════════════════════════════════════
  // ═════════════════════════════════════════════════════════
  //  FLOW 1: ADD NEW CUSTOMER
  // ═════════════════════════════════════════════════════════
  const isAddCustExplicit =
    lower.includes('customer') || lower.includes('வாடிக்கையாளர்') || lower.includes('client') ||
    lower.includes('கஸ்டமர்') || lower.includes('நியூ கஸ்டமர்') || lower.includes('புது கஸ்டமர்') ||
    lower.includes('புதிய வாடிக்கையாளர்') || lower.includes('புதிய கஸ்டமர்') || lower.includes('புதுசு') ||
    (lower.includes('add') && lower.includes('cust')) || (lower.includes('new') && lower.includes('cust'));

  const isAdvanceTrigger =
    lower.includes('advance') || lower.includes('advans') || lower.includes('adv') ||
    lower.includes('அட்வான்ஸ்') || lower.includes('varavu') || lower.includes('வரவு') ||
    lower.includes('panam vandhuchu') || lower.includes('money in') || lower.includes('payment received');

  if (isAddCustExplicit && !isAdvanceTrigger) {
    let cleanName = raw
      .replace(/pudhu|new|add|customer|client|வாடிக்கையாளர்|கஸ்டமர்|நியூ|புதிய|புது|சேர்க்க|பதிவு|register|create/gi, '')
      .replace(/(?:phone|mobile|போன்|எண்|number)\s*[0-9]+/gi, '')
      .replace(/[0-9]{10}/g, '')
      .replace(/namakkal|salem|chennai|tiruchengode|erode/gi, '')
      .replace(/^[,\s-]+|[,\s-]+$/g, '')
      .trim();

    const initialData: Record<string, any> = {};
    if (cleanName && cleanName.length > 2) initialData.name = cleanName;
    if (phone) initialData.phone = phone;

    const session = startWizardSession('add_customer', initialData);
    if (session.isComplete && session.finalIntent) {
      return { intent: session.finalIntent, wizardSession: session };
    }
    return { wizardSession: session };
  }

  // ═════════════════════════════════════════════════════════
  //  FLOW 2: CUSTOMER ADVANCE (MONEY IN)
  // ═════════════════════════════════════════════════════════
  if (isAdvanceTrigger && !lower.includes('lathe') && !lower.includes('welding') && !lower.includes('selavu')) {
    let custName = matchedCustomer?.name;
    if (!custName) {
      const clean = raw
        .replace(/advance|advans|adv|varavu|வரவு|அட்வான்ஸ்|paid|payment|gpay|cash|upi|[0-9,]+/gi, '')
        .replace(/^[,\s-]+|[,\s-]+$/g, '')
        .trim();
      if (clean && clean.length > 2) custName = clean;
    }

    const initialData: Record<string, any> = {};
    if (custName) initialData.customerName = custName;
    if (amount > 0) initialData.amount = amount;
    if (lower.includes('gpay') || lower.includes('upi') || lower.includes('cash') || lower.includes('bank')) {
      initialData.method = method;
    }

    const session = startWizardSession('customer_advance', initialData);
    if (session.isComplete && session.finalIntent) {
      return { intent: session.finalIntent, wizardSession: session };
    }
    return { wizardSession: session };
  }

  // ═════════════════════════════════════════════════════════
  //  FLOW 3: VEHICLE DIRECT EXPENSE (LATHE, WELDING, DIESEL, HOSE)
  // ═════════════════════════════════════════════════════════
  const isVehicleExp = lower.includes('lathe') || lower.includes('turning') || lower.includes('லேத்') ||
    lower.includes('welding') || lower.includes('வெல்டிங்') ||
    lower.includes('hose') || lower.includes('ஹோஸ்') ||
    lower.includes('diesel') || lower.includes('டீசல்') || lower.includes('fuel') ||
    lower.includes('selavu') || lower.includes('செலவு') || lower.includes('expense');

  if (isVehicleExp) {
    let expType = 'lathe_work';
    if (lower.includes('welding') || lower.includes('வெல்டிங்')) expType = 'welding';
    else if (lower.includes('hose') || lower.includes('ஹோஸ்')) expType = 'hydraulic_hose';
    else if (lower.includes('diesel') || lower.includes('டீசல்')) expType = 'diesel_fuel';

    const initialData: Record<string, any> = { expenseType: expType };
    if (amount > 0) initialData.amount = amount;
    initialData.method = method;
    initialData.description = raw;

    const session = startWizardSession('vehicle_expense', initialData);
    if (session.isComplete && session.finalIntent) {
      return { intent: session.finalIntent, wizardSession: session };
    }
    return { wizardSession: session };
  }

  // ═════════════════════════════════════════════════════════
  //  FLOW 4: WORKER ATTENDANCE
  // ═════════════════════════════════════════════════════════
  const isAttendanceTrigger = lower.includes('absent') || lower.includes('present') || lower.includes('half day') ||
    lower.includes('halfday') || lower.includes('ஆப்சன்ட்') || lower.includes('பிரசண்ட்') || lower.includes('பிரசன்ட்') ||
    lower.includes('லீவு') || lower.includes('விடுமுறை') || lower.includes('varala') || lower.includes('வரல') ||
    lower.includes('attendance') || lower.includes('வருகை') || lower.includes('அட்டண்டன்ஸ்');

  if (isAttendanceTrigger) {
    let workerName = matchedWorker?.name;
    if (!workerName) {
      const clean = raw
        .replace(/innaiku|today|attendance|present|absent|leave|halfday|half\s+day|varala|vandhan|இன்னைக்கு|இன்று|ஆப்சன்ட்|பிரசண்ட்|பிரசன்ட்|லீவு|விடுமுறை|வருகை|அட்டண்டன்ஸ்/gi, '')
        .replace(/^[,\s-]+|[,\s-]+$/g, '')
        .trim();
      if (clean && clean.length > 2) workerName = clean.split(' ')[0];
    }

    const status: 'present' | 'absent' | 'half_day' =
      (lower.includes('absent') || lower.includes('ஆப்சன்ட்') || lower.includes('லீவு') || lower.includes('varala') || lower.includes('வரல') || lower.includes('விடுமுறை')) ? 'absent' :
      (lower.includes('half') || lower.includes('ஹாப்')) ? 'half_day' : 'present';

    const initialData: Record<string, any> = { status };
    if (workerName) initialData.workerName = workerName;

    const session = startWizardSession('worker_attendance', initialData);
    if (session.isComplete && session.finalIntent) {
      return { intent: session.finalIntent, wizardSession: session };
    }
    return { wizardSession: session };
  }

  // ═════════════════════════════════════════════════════════
  //  FLOW 5: ADD EMPLOYEE / WORKER
  // ═════════════════════════════════════════════════════════
  const isWorkerTrigger = lower.includes('pudhu aal') || lower.includes('new worker') || lower.includes('add worker') ||
    lower.includes('add employee') || lower.includes('புதிய பணியாளர்') || lower.includes('புது ஆள்') ||
    lower.includes('mechanic') || lower.includes('welder') || lower.includes('helper') ||
    lower.includes('ஒர்க்கர்') || lower.includes('பணியாளர் சேர்க்க');

  if (isWorkerTrigger && !matchedWorker) {
    let clean = raw
      .replace(/pudhu|aal|new|add|worker|employee|mechanic|welder|helper|salary|சம்பளம்|ஒர்க்கர்|பணியாளர்/gi, '')
      .replace(/[0-9]+/g, '')
      .replace(/^[,\s-]+|[,\s-]+$/g, '')
      .trim();

    const initialData: Record<string, any> = {};
    if (clean && clean.length > 2) initialData.name = clean;
    if (amount > 0) initialData.salary = amount;
    if (phone) initialData.phone = phone;

    const session = startWizardSession('add_worker', initialData);
    if (session.isComplete && session.finalIntent) {
      return { intent: session.finalIntent, wizardSession: session };
    }
    return { wizardSession: session };
  }

  // ═════════════════════════════════════════════════════════
  //  FLOW 6: ADD BORE RIG VEHICLE
  // ═════════════════════════════════════════════════════════
  const isRigTrigger = lower.includes('bore rig') || lower.includes('add rig') || lower.includes('pudhu vandi') ||
    lower.includes('புது வண்டி') || lower.includes('போர் வண்டி') || lower.includes('வண்டி சேர்க்க') || (regNo !== undefined && lower.includes('rig'));

  if (isRigTrigger) {
    const initialData: Record<string, any> = {};
    if (matchedCustomer) initialData.customerName = matchedCustomer.name;
    if (regNo) initialData.regNo = regNo;

    const session = startWizardSession('add_vehicle', initialData);
    if (session.isComplete && session.finalIntent) {
      return { intent: session.finalIntent, wizardSession: session };
    }
    return { wizardSession: session };
  }

  // ═════════════════════════════════════════════════════════
  //  FLOW 7: SUPPLIER / STOCK
  // ═════════════════════════════════════════════════════════
  if (lower.includes('supplier') || lower.includes('சப்ளையர்')) {
    const initialData: Record<string, any> = {};
    if (matchedSupplier) initialData.name = matchedSupplier.name;
    const session = startWizardSession('add_supplier', initialData);
    return { wizardSession: session };
  }

  if (lower.includes('stock') || lower.includes('ஸ்டாக்') || lower.includes('part add')) {
    const session = startWizardSession('add_part', {});
    return { wizardSession: session };
  }

  // ═════════════════════════════════════════════════════════
  //  FLOW 8: QUERY / INTELLIGENCE
  // ═════════════════════════════════════════════════════════
  const isQuery = lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('who') ||
    lower.startsWith('which') || lower.startsWith('when') || lower.startsWith('show') || lower.startsWith('tell') ||
    lower.includes('evlo') || lower.includes('balance') || lower.includes('collection') ||
    lower.includes('profit') || lower.includes('எவ்வளவு') || lower.includes('யார்') ||
    lower.includes('லாபம்') || lower.includes('வசூல்') || lower.includes('சொல்லு') ||
    lower.includes('பதில்') || lower.includes('விவரம்') || lower.includes('status');

  if (isQuery) {
    const answer = await askTroyz(text);
    return {
      intent: {
        type: 'query',
        question: text,
        answer,
      },
    };
  }

  // ═════════════════════════════════════════════════════════
  //  FALLBACK: ASK GEMINI / LOCAL INTELLIGENCE
  // ═════════════════════════════════════════════════════════
  const intelligentAnswer = await askTroyz(text);
  if (intelligentAnswer && !intelligentAnswer.includes('புரியலை')) {
    return {
      intent: {
        type: 'query',
        question: text,
        answer: intelligentAnswer,
      },
    };
  }

  // ═════════════════════════════════════════════════════════
  //  BARE NUMBER CHECK
  // ═════════════════════════════════════════════════════════
  if (amount > 0) {
    return {
      intent: {
        type: 'unknown',
        raw: text,
        clarifyPromptTamil: `₹${amount.toLocaleString('en-IN')} இது வாடிக்கையாளர் அட்வான்ஸா அல்லது பட்டறை செலவா? விவரம் சொல்லுங்க.`,
        clarifyPromptEnglish: `₹${amount.toLocaleString('en-IN')}: Is this a customer advance or workshop expense? Please specify.`,
      },
    };
  }

  return { intent: { type: 'unknown', raw: text } };
}

// ═══════════════════════════════════════════════════════════
//  UNIVERSAL VOICE EXECUTOR — COMMITS TO ALL MODULES
// ═══════════════════════════════════════════════════════════

export async function executeVoiceAction(intent: ParsedIntent): Promise<{ success: boolean; messageTamil: string; messageEnglish: string }> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Add Customer
    if (intent.type === 'add_customer') {
      const c = await saveCustomer({
        name: intent.name,
        phone: intent.phone || '9999999999',
        address: intent.address || '',
        whatsapp: intent.whatsapp || intent.phone || '',
      });
      return {
        success: true,
        messageTamil: `சூப்பர்! வாடிக்கையாளர் ${c.name} சேத்தாச்சு!`,
        messageEnglish: `Awesome! Added customer ${c.name} successfully!`,
      };
    }

    // 2. Add Bore Rig Vehicle
    if (intent.type === 'add_vehicle') {
      if (!intent.customerId) {
        const customers = await getAllCustomers();
        const found = customers.find(c => c.name.toLowerCase().includes(intent.customerName.toLowerCase()));
        if (found) intent.customerId = found.id;
        else if (customers.length > 0) intent.customerId = customers[0].id;
      }

      if (!intent.customerId) {
        return {
          success: false,
          messageTamil: `யாருக்கு இந்த வண்டியை சேர்க்கணும்? வாடிக்கையாளரை சொல்லுங்க.`,
          messageEnglish: `Which customer does this vehicle belong to? Please specify.`,
        };
      }

      await saveVehicle({
        customerId: intent.customerId,
        regNo: intent.regNo.toUpperCase(),
        make: intent.make || 'Ashok Leyland',
        model: intent.model || 'PRD 1000',
        rigType: intent.rigType || 'DTH Rig',
        compressorDetails: intent.compressorDetails || 'ELGi 1100 CFM / 300 PSI',
      });

      return {
        success: true,
        messageTamil: `நல்லது! போர் வண்டி ${intent.regNo} சேர்த்தாச்சு!`,
        messageEnglish: `Great! Bore Rig ${intent.regNo} added successfully!`,
      };
    }

    // 3. Add Worker
    if (intent.type === 'add_worker') {
      const w = await saveWorker({
        name: intent.name,
        role: intent.role,
        phone: intent.phone || '',
        salary: intent.salary,
        joinDate: todayStr,
        isActive: true,
      });
      const roleTamil = w.role === 'lathe_operator' ? 'லேத் ஆபரேட்டர்' : w.role === 'helper' ? 'ஹெல்ப்பர்' : w.role === 'welder' ? 'வெல்டர்' : w.role === 'driver' ? 'டிரைவர்' : 'மெக்கானிக்';
      return {
        success: true,
        messageTamil: `சூப்பர்! புது ஆள் ${w.name} ${roleTamil}ஆ வேலைக்கு சேர்த்தாச்சு!`,
        messageEnglish: `Great! Added ${w.name} as ${w.role} with salary ₹${w.salary}!`,
      };
    }

    // 4. Add Supplier
    if (intent.type === 'add_supplier') {
      const s = await saveSupplier({
        name: intent.name,
        phone: intent.phone || '',
        address: intent.address || '',
        totalPurchased: 0,
        totalPaid: 0,
        balance: 0,
      });
      return {
        success: true,
        messageTamil: `சரிங்க! சப்ளையர் ${s.name} சேர்த்தாச்சு!`,
        messageEnglish: `Got it! Supplier ${s.name} added successfully!`,
      };
    }

    // 5. Add Part / Stock
    if (intent.type === 'add_part') {
      const p = await savePart({
        name: intent.name,
        sku: intent.sku,
        stock: intent.stock,
        minStock: 5,
        unit: 'nos',
        category: intent.category as any,
        purchasePrice: intent.purchasePrice,
        sellingPrice: intent.sellingPrice,
      });
      return {
        success: true,
        messageTamil: `ஸ்டாக் சேர்ந்தாச்சு: ${p.name} ${p.stock} எண்ணிக்கை!`,
        messageEnglish: `Stock added: ${p.name} (${p.stock} units)!`,
      };
    }

    // 6. Customer Advance
    if (intent.type === 'customer_advance') {
      let custId = intent.customerId;
      if (!custId) {
        const customers = await getAllCustomers();
        const found = customers.find(c => c.name.toLowerCase().includes(intent.customerName.toLowerCase()));
        if (found) custId = found.id;
        else {
          const newCust = await saveCustomer({
            name: intent.customerName,
            phone: '9845123456',
            address: 'Workshop',
          });
          custId = newCust.id;
        }
      }

      await saveExpense({
        category: 'other',
        amount: intent.amount,
        date: todayStr,
        description: `Customer Advance: ${intent.customerName} (${intent.method.toUpperCase()})`,
        method: intent.method as any,
        customerId: custId,
      });

      return {
        success: true,
        messageTamil: `அருமை! ${intent.customerName} அட்வான்ஸ் ₹${intent.amount.toLocaleString('en-IN')} கணக்கில் சேர்ந்தாச்சு!`,
        messageEnglish: `Awesome! Recorded ₹${intent.amount.toLocaleString('en-IN')} Advance from ${intent.customerName}!`,
      };
    }

    // 7. Vehicle Expense (Lathe, Welding, Hose, Diesel)
    if (intent.type === 'vehicle_expense') {
      await saveExpense({
        category: 'customer_vehicle_direct',
        amount: intent.amount,
        date: todayStr,
        description: intent.description || 'Workshop Direct Expense',
        method: intent.method as any,
        vehicleId: intent.vehicleId,
        expenseType: intent.expenseType,
      });

      return {
        success: true,
        messageTamil: `சரிங்க! செலவு ₹${intent.amount.toLocaleString('en-IN')} வெற்றிகரமாக பதிவாச்சு!`,
        messageEnglish: `Recorded ₹${intent.amount.toLocaleString('en-IN')} direct expense successfully!`,
      };
    }

    // 8. General Expense
    if (intent.type === 'general_expense') {
      await saveExpense({
        category: (intent.category as any) || 'other',
        amount: intent.amount,
        date: todayStr,
        description: intent.description,
        method: (intent.method as any) || 'cash',
      });

      return {
        success: true,
        messageTamil: `பொதுச் செலவு ₹${intent.amount.toLocaleString('en-IN')} சேர்க்கப்பட்டது!`,
        messageEnglish: `Saved general expense of ₹${intent.amount.toLocaleString('en-IN')}!`,
      };
    }

    // 9. Worker Attendance
    if (intent.type === 'worker_attendance') {
      let workerId = intent.workerId;
      if (!workerId) {
        const workers = await getAllWorkers();
        const found = workers.find(w => w.name.toLowerCase().includes(intent.workerName.toLowerCase()));
        if (found) workerId = found.id;
        else {
          const newW = await saveWorker({
            name: intent.workerName,
            role: 'mechanic',
            salary: 15000,
            joinDate: todayStr,
            isActive: true,
          });
          workerId = newW.id;
        }
      }

      await markAttendance({
        workerId: workerId!,
        date: intent.date,
        status: intent.status,
      });

      const label = intent.status === 'present' ? 'வருகை (Present)' : intent.status === 'absent' ? 'விடுமுறை (Absent)' : 'அரை நாள் (Half-day)';
      return {
        success: true,
        messageTamil: `பணியாளர் ${intent.workerName} இன்று ${label} குறிக்கப்பட்டது!`,
        messageEnglish: `Marked ${intent.workerName} as ${intent.status.toUpperCase()} for today!`,
      };
    }

    // 10. Worker Salary Advance / Bonus
    if (intent.type === 'worker_advance') {
      let workerId = intent.workerId;
      if (!workerId) {
        const workers = await getAllWorkers();
        const found = workers.find(w => w.name.toLowerCase().includes(intent.workerName.toLowerCase()));
        if (found) workerId = found.id;
        else {
          const newW = await saveWorker({
            name: intent.workerName,
            role: 'mechanic',
            salary: 15000,
            joinDate: todayStr,
            isActive: true,
          });
          workerId = newW.id;
        }
      }

      await saveAdvance({
        workerId: workerId!,
        amount: intent.amount,
        date: todayStr,
        type: intent.actionType || 'advance',
        note: intent.note || 'Salary Advance via Voice',
      });

      return {
        success: true,
        messageTamil: `பணியாளர் ${intent.workerName}க்கு ₹${intent.amount.toLocaleString('en-IN')} அட்வான்ஸ் பதிவு செய்யப்பட்டது!`,
        messageEnglish: `Saved ₹${intent.amount.toLocaleString('en-IN')} advance for ${intent.workerName}!`,
      };
    }

    // 11. Supplier Payment
    if (intent.type === 'supplier_payment') {
      let supId = intent.supplierId;
      if (!supId) {
        const suppliers = await getAllSuppliers();
        const found = suppliers.find(s => s.name.toLowerCase().includes(intent.supplierName.toLowerCase()));
        if (found) supId = found.id;
        else {
          const newSup = await saveSupplier({
            name: intent.supplierName,
            phone: '9845112233',
            address: 'Salem',
            totalPurchased: 0,
            totalPaid: 0,
            balance: 0,
          });
          supId = newSup.id;
        }
      }

      await saveExpense({
        category: 'parts_stock',
        amount: intent.amount,
        date: todayStr,
        description: `Supplier payment to ${intent.supplierName}`,
        method: intent.method as any,
        supplierId: supId,
      });

      return {
        success: true,
        messageTamil: `சப்ளையர் ${intent.supplierName}க்கு ₹${intent.amount.toLocaleString('en-IN')} பேமெண்ட் பதிவாச்சு!`,
        messageEnglish: `Paid ₹${intent.amount.toLocaleString('en-IN')} to supplier ${intent.supplierName}!`,
      };
    }

    return {
      success: false,
      messageTamil: `மன்னிச்சுக்கோங்க, இதை பதிவு பண்ண முடியல. மறுபடியும் சொல்லுங்க.`,
      messageEnglish: `Sorry, could not process that. Please try again.`,
    };
  } catch (err: any) {
    return {
      success: false,
      messageTamil: `மன்னிச்சுக்கோங்க, ஒரு பிழை வந்திடுச்சு: ${err.message || 'பதிவு செய்ய முடியவில்லை'}`,
      messageEnglish: `Sorry, an error occurred: ${err.message || 'Failed to execute'}`,
    };
  }
}

// ═══════════════════════════════════════════════════════════
//  TEXT-TO-SPEECH (SPEAKS BACK AUDIBLY LIKE A HUMAN)
// ═══════════════════════════════════════════════════════════

export function convertTamilToSpokenPhonetics(text: string): string {
  let s = text
    .replace(/[✅⚡👤🛠️📋💰⚠️🤔💡•]/g, '')
    .replace(/₹\s*([0-9,]+)/g, '$1 rupees ')
    .replace(/[()]/g, '')
    .replace(/["']/g, '')
    .trim();

  const replacements: [RegExp, string][] = [
    [/மன்னிச்சுக்கோங்க|மன்னிச்சிடுங்க/g, 'Mannichukkonga'],
    [/புரியலங்க|புரியவில்லை|புரியலை/g, 'puriyala'],
    [/மறுபடியும்|மீண்டும்/g, 'marubadiyum'],
    [/தெளிவா சொல்லுங்க|சொல்லவும்|சொல்லுங்க/g, 'sollunga'],
    [/நீங்க சொன்ன/g, 'Neenga sonnadhu'],
    [/முழுசா புரியலைங்க/g, 'puriyala'],
    [/கஸ்டமர்/g, 'Customer'],
    [/வாடிக்கையாளர்/g, 'Customer'],
    [/அட்வான்ஸ்/g, 'advance'],
    [/செலவு/g, 'expense'],
    [/பணியாளர்/g, 'worker'],
    [/வருகை/g, 'attendance present'],
    [/விடுமுறை/g, 'absent'],
    [/போர் வண்டி/g, 'bore rig'],
    [/புதிய|புது/g, 'new'],
    [/சேர்க்கவா|உறுதி செய்யவா/g, 'confirm pannava?'],
    [/பச்சை பட்டனை அழுத்தவும்/g, 'tap confirm button to save'],
    [/சேமிக்கப்படுகிறது/g, 'saving now'],
    [/வெற்றிகரமாக/g, 'Successfully'],
    [/கணக்கில் சேர்த்தாச்சு|சேத்தாச்சு|சேமிக்கப்பட்டது/g, 'save panniyaachu!'],
    [/ரூபாய்/g, 'rupees'],
    [/லேத் டர்னிங்/g, 'Lathe turning'],
    [/வெல்டிங்/g, 'Welding'],
    [/டீசல்/g, 'Diesel'],
    [/ஹைட்ராலிக் ஹோஸ்/g, 'Hydraulic hose'],
    [/இணைப்பு/g, 'connection'],
    [/இணைய பிழை/g, 'Network error'],
    [/மைக்ரோஃபோன்/g, 'Microphone'],
  ];

  for (const [pattern, rep] of replacements) {
    s = s.replace(pattern, rep);
  }

  return s;
}

let currentTtsCallback: (() => void) | null = null;
let ttsSafetyTimer: ReturnType<typeof setTimeout> | null = null;

export function stopTroyzSpeech(): void {
  if (typeof window === 'undefined') return;
  currentTtsCallback = null;
  if (ttsSafetyTimer) {
    clearTimeout(ttsSafetyTimer);
    ttsSafetyTimer = null;
  }
  try {
    const native = (window as any).AndroidNativeVoice;
    if (native && typeof native.stopSpeaking === 'function') {
      native.stopSpeaking();
    }
  } catch (_) {}
  try {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  (window as any).onNativeTtsFinished = () => {
    if (ttsSafetyTimer) {
      clearTimeout(ttsSafetyTimer);
      ttsSafetyTimer = null;
    }
    if (currentTtsCallback) {
      const cb = currentTtsCallback;
      currentTtsCallback = null;
      cb();
    }
  };

  (window as any).onNativeTtsError = (err: string) => {
    console.warn('Native TTS error:', err);
    if (ttsSafetyTimer) {
      clearTimeout(ttsSafetyTimer);
      ttsSafetyTimer = null;
    }
    if (currentTtsCallback) {
      const cb = currentTtsCallback;
      currentTtsCallback = null;
      cb();
    }
  };
}

const BENIGN_SPEECH_ERRORS = [
  '11', 'timeout', 'busy', 'no-speech', 'client', 'aborted', 'audio-capture',
  'network', 'native speech error', 'error: 5', 'error: 7', 'error: 8', 'error: 9',
];

export function isBenignSpeechError(err: string): boolean {
  const lower = (err || '').toLowerCase();
  return BENIGN_SPEECH_ERRORS.some(token => lower.includes(token));
}

export function speakTroyzResponse(text: string, lang = 'ta-IN', onDone?: () => void): void {
  if (typeof window === 'undefined') {
    if (onDone) onDone();
    return;
  }

  let doneFired = false;
  const safeOnDone = () => {
    if (doneFired) return;
    doneFired = true;
    currentTtsCallback = null;
    if (ttsSafetyTimer) {
      clearTimeout(ttsSafetyTimer);
      ttsSafetyTimer = null;
    }
    if (onDone) onDone();
  };

  currentTtsCallback = safeOnDone;

  const nativeVoice = (window as any).AndroidNativeVoice;
  const isNative = nativeVoice && typeof nativeVoice.speak === 'function';
  const isNativeTamilAvailable = isNative && typeof nativeVoice.isTamilTtsAvailable === 'function'
    ? nativeVoice.isTamilTtsAvailable()
    : false;

  let cleanSpeech = text;
  let targetLang = lang;

  let hasBrowserTamilVoice = false;
  if ('speechSynthesis' in window) {
    const voices = window.speechSynthesis.getVoices();
    hasBrowserTamilVoice = voices.some(v => v.lang.startsWith('ta') || v.name.toLowerCase().includes('tamil'));
  }

  if (lang === 'ta-IN' && !isNativeTamilAvailable && !hasBrowserTamilVoice) {
    cleanSpeech = convertTamilToSpokenPhonetics(text);
    targetLang = 'en-IN';
  } else {
    cleanSpeech = text
      .replace(/[✅⚡•*#]/g, '')
      .replace(/₹\s*([0-9,]+)/g, '$1 ரூபாய்')
      .replace(/[()]/g, '')
      .replace(/["']/g, '')
      .trim();
  }

  if (!cleanSpeech) {
    safeOnDone();
    return;
  }

  // Safety timer — ALWAYS fires as last resort to unblock the cycle
  const maxSpeechTime = Math.max(3000, Math.min(18000, cleanSpeech.length * 100 + 2000));
  if (ttsSafetyTimer) clearTimeout(ttsSafetyTimer);
  ttsSafetyTimer = setTimeout(() => {
    safeOnDone();
  }, maxSpeechTime);

  // 1. Native Android TTS (Hardware speaker output on phones)
  if (isNative) {
    try {
      if (typeof nativeVoice.stopListening === 'function') {
        nativeVoice.stopListening();
      }
      nativeVoice.speak(cleanSpeech, targetLang);
      return;
    } catch (e) {
      console.warn('Native TTS error', e);
      safeOnDone();
      return;
    }
  }

  // 2. Web Speech Fallback for browser
  if (!('speechSynthesis' in window)) {
    setTimeout(safeOnDone, 400);
    return;
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = targetLang;
    utterance.rate = 0.94;
    utterance.pitch = 1.0;

    (window as any)._activeTtsUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      let chosenVoice: SpeechSynthesisVoice | undefined;
      if (targetLang === 'ta-IN' || targetLang.startsWith('ta')) {
        chosenVoice = voices.find(v => v.lang === 'ta-IN' || v.lang.startsWith('ta') || v.name.toLowerCase().includes('tamil'));
      }
      if (!chosenVoice) {
        chosenVoice = voices.find(v => (v.name.includes('Google') || v.name.includes('Natural')) && (v.lang === 'en-IN' || v.lang.includes('IN'))) ||
          voices.find(v => v.lang === 'en-IN' || v.lang.includes('IN')) ||
          voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
          voices.find(v => v.lang.startsWith('en'));
      }
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
    }

    utterance.onend = () => {
      (window as any)._activeTtsUtterance = null;
      safeOnDone();
    };
    utterance.onerror = () => {
      (window as any)._activeTtsUtterance = null;
      safeOnDone();
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('TTS error', e);
    safeOnDone();
  }
}

// ═══════════════════════════════════════════════════════════
//  UNIVERSAL SPEECH RECOGNITION (NATIVE ANDROID + WEB SPEECH)
// ═══════════════════════════════════════════════════════════

export type SpeechCallback = (text: string, isFinal: boolean) => void;
export type SpeechErrorCallback = (error: string) => void;

export class VoiceRecognition {
  private recognition: any = null;
  private isListening = false;
  private onResult: SpeechCallback;
  private onError: SpeechErrorCallback;
  private onEnd: () => void;

  constructor(onResult: SpeechCallback, onError: SpeechErrorCallback, onEnd: () => void) {
    this.onResult = onResult;
    this.onError = onError;
    this.onEnd = onEnd;

    if (typeof window !== 'undefined') {
      (window as any).onNativeSpeechResult = (text: string, isFinal: boolean) => {
        this.onResult(text, isFinal);
        if (isFinal) {
          this.isListening = false;
        }
      };

      (window as any).onNativeSpeechEnd = () => {
        this.isListening = false;
        this.onEnd();
      };

      (window as any).onNativeSpeechError = (err: string) => {
        this.isListening = false;
        this.onError(err);
      };
    }
  }

  get isNative(): boolean {
    return typeof window !== 'undefined' &&
      !!(window as any).AndroidNativeVoice &&
      typeof (window as any).AndroidNativeVoice.startListening === 'function';
  }

  get isSupported(): boolean {
    return this.isNative || (typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window));
  }

  async start(language = 'ta-IN'): Promise<void> {
    if (!this.isSupported) {
      this.onError('Voice recognition not supported in this browser.');
      return;
    }
    if (this.isListening) return;

    // 1. Native Android Speech Recognition Bridge
    if (this.isNative) {
      this.isListening = true;
      try {
        (window as any).AndroidNativeVoice.startListening(language);
      } catch (e: any) {
        this.isListening = false;
        this.onError('Native speech error: ' + (e.message || e));
      }
      return;
    }

    // 2. Web Speech API Fallback
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      console.warn('Microphone permission check:', e);
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      this.onError('Speech recognition not available.');
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = language;
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      this.onResult(transcript, result.isFinal);
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      this.onError(event.error || 'no-speech');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEnd();
    };

    this.recognition.start();
    this.isListening = true;
  }

  stop(): void {
    this.isListening = false;
    if (this.isNative) {
      try {
        (window as any).AndroidNativeVoice.stopListening();
      } catch (ignored) {}
    }

    if (this.recognition) {
      try { this.recognition.stop(); } catch (ignored) {}
    }
  }

  get active(): boolean {
    return this.isListening;
  }
}

// ═══════════════════════════════════════════════════════════
//  ASK TROYZ — 100% FREE OFFLINE INTELLIGENCE + GEMINI EXPANSION
// ═══════════════════════════════════════════════════════════

export async function askTroyz(
  question: string,
  lang: 'ta-IN' | 'en-IN' = 'ta-IN'
): Promise<string> {
  const isTamil = lang === 'ta-IN';
  const lower = question.toLowerCase();

  // 1. Gather rich database context snapshot
  let customers: Customer[] = [];
  let vehicles: Vehicle[] = [];
  let workers: Worker[] = [];
  let expenses: any[] = [];
  let payments: any[] = [];
  let parts: Part[] = [];

  try {
    const [c, v, w, e, p, pt] = await Promise.all([
      getAllCustomers(),
      getAllVehicles(),
      getAllWorkers(),
      getAllExpenses(),
      getAllPayments(),
      getAllParts(),
    ]);
    customers = c;
    vehicles = v;
    workers = w;
    expenses = e;
    payments = p;
    parts = pt;
  } catch (_) { /* ignore */ }

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const activeWorkers = workers.filter(w => w.isActive);
  const lowStockParts = parts.filter(p => p.stock <= p.minStock);

  const apiKey = await resolveGeminiKey(getSetting);

  if (apiKey) {
    const contextLines = `
Customers: ${customers.length} (${customers.slice(0, 5).map(c => c.name).join(', ')})
Vehicles/Rigs: ${vehicles.length} (${vehicles.slice(0, 5).map(v => v.regNo).join(', ')})
Active Workers: ${activeWorkers.length} (${activeWorkers.map(w => w.name).join(', ')})
Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}
Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
Net Profit: ₹${netProfit.toLocaleString('en-IN')}
Low Stock: ${lowStockParts.map(p => `${p.name} (${p.stock})`).join(', ') || 'All in stock'}
`.trim();

    const systemPrompt = `You are MEW OS — a live conversational assistant for Mithra Engineering Works, a bore rig workshop in Tamil Nadu.
Answer in ${isTamil ? 'Tamil (natural conversational Tanglish/Tamil)' : 'English'}, 1-2 spoken sentences only.
No markdown or bullet points.
Snapshot:\n${contextLines}`;

    const result = await callGemini({
      systemPrompt,
      userMessage: question,
      apiKey,
      temperature: 0.4,
      maxOutputTokens: 180,
    });
    if (result) return result.text;
  }

  // 3. 100% Free Smart Local Conversational Brain (Zero API Key Needed!)
  
  // Politics & Current Affairs
  if (lower.includes('cm') || lower.includes('chief minister') || lower.includes('முதலமைச்சர்') || lower.includes('முதல்வர்') || lower.includes('stalin') || lower.includes('ஸ்டாலின்')) {
    return isTamil
      ? 'தமிழ்நாட்டின் தற்போதைய முதலமைச்சர் மாண்புமிகு திரு. மு.க. ஸ்டாலின் (M.K. Stalin) அவர்கள்.'
      : 'The Chief Minister of Tamil Nadu is Thiru M.K. Stalin.';
  }

  if (lower.includes('pm') || lower.includes('prime minister') || lower.includes('பிரதமர்') || lower.includes('modi') || lower.includes('மோடி')) {
    return isTamil
      ? 'இந்தியாவின் தற்போதைய பிரதமர் மாண்புமிகு திரு. நரேந்திர மோடி (Narendra Modi) அவர்கள்.'
      : 'The Prime Minister of India is Thiru Narendra Modi.';
  }

  if (lower.includes('governor') || lower.includes('ஆளுநர்')) {
    return isTamil
      ? 'தமிழ்நாட்டின் ஆளுநர் திரு. ஆர்.என். ரவி (R.N. Ravi) அவர்கள்.'
      : 'The Governor of Tamil Nadu is Thiru R.N. Ravi.';
  }

  if (lower.includes('president') || lower.includes('ஜனாதிபதி') || lower.includes('குடியரசு தலைவர்')) {
    return isTamil
      ? 'இந்தியாவின் குடியரசு தலைவர் திருமதி திரௌபதி முர்மு அவர்கள்.'
      : 'The President of India is Smt. Droupadi Murmu.';
  }

  // Geography & Towns
  if (lower.includes('நாமக்கல்') || lower.includes('namakkal')) {
    return isTamil
      ? 'நாமக்கல் மாவட்டம் ஆழ்துளை கிணறு லாரிகள் (Borewell Rigs), முட்டை உற்பத்தி மற்றும் லாரி பாடி கட்டும் தொழிலுக்கு மிகவும் பிரபலமானது.'
      : 'Namakkal is renowned for borewell rig fabrication, poultry farming, and heavy transport industries.';
  }

  if (lower.includes('திருச்செங்கோடு') || lower.includes('tiruchengode')) {
    return isTamil
      ? 'திருச்செங்கோடு போர்வெல் ரிக் தயாரிப்பு, ஆழ்துளை கிணறு சர்வீஸ் மற்றும் அர்த்தநாரீஸ்வரர் மலைக் கோவிலுக்கு புகழ் பெற்றது.'
      : 'Tiruchengode is famous for its borewell rig manufacturing units and the historic Arthanareeswarar hill temple.';
  }

  if (lower.includes('சேலம்') || lower.includes('salem')) {
    return isTamil
      ? 'சேலம் மாம்பழம் மற்றும் ஸ்டீல் பிளாண்ட்டுக்கு பெயர் பெற்ற ஒரு முக்கியமான தொழில் நகரம்.'
      : 'Salem is well known for its steel industry and famous mangoes.';
  }

  if (lower.includes('சென்னை') || lower.includes('chennai') || lower.includes('capital')) {
    return isTamil
      ? 'சென்னை தமிழ்நாட்டின் தலைநகரம் மற்றும் கலாச்சார, மருத்துவ, தொழில் மையமாக விளங்குகிறது.'
      : 'Chennai is the capital city of Tamil Nadu.';
  }

  // Date / Day / Time
  if (lower.includes('date') || lower.includes('today') || lower.includes('day') || lower.includes('time') || lower.includes('தேதி') || lower.includes('இன்று') || lower.includes('நேரம்') || lower.includes('கிழமை')) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return isTamil
      ? `இன்று ${dateStr}, நேரம் ${timeStr}.`
      : `Today is ${dateStr}, and the current time is ${timeStr}.`;
  }

  // Engineering & Bore Rig Facts
  if (lower.includes('compressor') || lower.includes('psi') || lower.includes('cfm') || lower.includes('கம்ப்ரசர்')) {
    return isTamil
      ? 'போர்வெல் ரிக் கம்ப்ரசர்கள் பொதுவாக 1100 முதல் 1200 CFM மற்றும் 300 முதல் 350 PSI அழுத்தத்தில் இயங்குகின்றன.'
      : 'Bore rig compressors typically operate at 1100-1200 CFM with 300-350 PSI pressure for optimal DTH drilling.';
  }

  if (lower.includes('hammer') || lower.includes('bit') || lower.includes('drill') || lower.includes('rod') || lower.includes('ஹேமர்') || lower.includes('ராட்')) {
    return isTamil
      ? 'போர்வெல் ட்ரில்லிங்கிற்கு 4.5 இன்ச், 6 இன்ச் மற்றும் 8 இன்ச் DTH ஹேமர்கள் மற்றும் 15ft, 20ft ட்ரில் ராடுகள் பயன்படுத்தப்படுகின்றன.'
      : 'Borewell rigs commonly use 4.5-inch, 6-inch, and 8-inch DTH hammers along with 15ft to 20ft drill rods.';
  }

  // Personality, Jokes & Casual Chit-Chat
  if (lower.includes('who are you') || lower.includes('யார் நீ') || lower.includes('உன் பெயர்')) {
    return isTamil
      ? 'நான் MEW OS — மித்ரா பட்டறை மற்றும் உங்கள் ஸ்மார்ட் AI வாய்ஸ் உதவியாளர்.'
      : 'I am MEW OS — your intelligent workshop and personal voice assistant.';
  }

  if (lower.includes('joke') || lower.includes('ஜோக்') || lower.includes('சிரிப்பு')) {
    return isTamil
      ? 'ஒரு வாடிக்கையாளர் மெக்கானிக்கிடம் கேட்டாராம்: வண்டி எப்போ ரெடி ஆகும்? மெக்கானிக் சொன்னாராம்: நீங்க ஸ்பேர் பார்ட்ஸ் வாங்குற வேகத்தை பொறுத்தது!'
      : 'A mechanic told a customer: Your vehicle will be ready as soon as you finish bringing the spare parts!';
  }

  if (lower.includes('வணக்கம்') || lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('epdi irukka') || lower.includes('நலமா') || lower.includes('how are you')) {
    return isTamil
      ? 'வணக்கம்! நான் ரொம்ப நல்லா இருக்கேன். உங்களுக்கு உதவ எப்போதும் தயாரா இருக்கேன். சொல்லுங்க!'
      : 'Hello! I am doing great and always ready to help you. How can I assist you today?';
  }

  if (lower.includes('thanks') || lower.includes('thank you') || lower.includes('நன்றி')) {
    return isTamil
      ? 'ரொம்ப மகிழ்ச்சி! வேற ஏதாவது உதவி வேணுமா?'
      : 'You are very welcome! Let me know if you need anything else.';
  }

  // Revenue / Income / Collections
  if (lower.includes('வருமானம்') || lower.includes('சம்பாதி') || lower.includes('revenue') || lower.includes('make') || lower.includes('collection') || lower.includes('income') || lower.includes('லாபம்') || lower.includes('profit')) {
    return isTamil
      ? `பட்டறையில் மொத்த வரவு ₹${totalRevenue.toLocaleString('en-IN')}, மொத்த செலவு ₹${totalExpenses.toLocaleString('en-IN')}, நிகர லாபம் ₹${netProfit.toLocaleString('en-IN')}.`
      : `Total revenue is ₹${totalRevenue.toLocaleString('en-IN')}, expenses are ₹${totalExpenses.toLocaleString('en-IN')}, with net balance ₹${netProfit.toLocaleString('en-IN')}.`;
  }

  // Expenses / Lathe / Welding / Diesel
  if (lower.includes('செலவு') || lower.includes('expense') || lower.includes('spent') || lower.includes('selavu')) {
    return isTamil
      ? `மொத்த பட்டறை செலவு ₹${totalExpenses.toLocaleString('en-IN')}. இதில் லேத், வெல்டிங் மற்றும் உதிரிபாக செலவுகள் அடங்கும்.`
      : `Total workshop expenses stand at ₹${totalExpenses.toLocaleString('en-IN')}.`;
  }

  // Pending / Receivables / Who owes money
  if (lower.includes('பாக்கி') || lower.includes('pending') || lower.includes('balance') || lower.includes('owed') || lower.includes('hasn\'t paid') || lower.includes('யாரு')) {
    if (customers.length === 0) {
      return isTamil ? 'தற்போது வாடிக்கையாளர் பாக்கி எதுவும் இல்லை.' : 'There are no pending customer balances.';
    }
    const sampleCusts = customers.slice(0, 3).map(c => c.name).join(', ');
    return isTamil
      ? `பட்டறையில் ${customers.length} வாடிக்கையாளர்கள் உள்ளனர் (${sampleCusts}). கணக்கு விவரங்கள் பார்க்க Money பக்கத்திற்கு செல்லவும்.`
      : `You have ${customers.length} registered customers. Check the Money tab for individual balances.`;
  }

  // Stock / Parts / Oil
  if (lower.includes('ஸ்டாக்') || lower.includes('stock') || lower.includes('parts') || lower.includes('oil') || lower.includes('பொருள்') || lower.includes('ஸ்பேர்')) {
    if (lowStockParts.length > 0) {
      const names = lowStockParts.slice(0, 3).map(p => `${p.name} (${p.stock})`).join(', ');
      return isTamil
        ? `குறைவாக உள்ள உதிரிபாகங்கள்: ${names}. உடனே ஆர்டர் செய்யவும்.`
        : `Low stock items: ${names}.`;
    }
    return isTamil
      ? `அனைத்து உதிரிபாகங்களும் போதுமான அளவில் ஸ்டாக்கில் உள்ளன (மொத்தம் ${parts.length} பொருட்கள்).`
      : `All parts have sufficient stock level (${parts.length} items).`;
  }

  // Workers / Attendance
  if (lower.includes('பணியாளர்') || lower.includes('worker') || lower.includes('employee') || lower.includes('ஆட்கள்') || lower.includes('வேலையாள்')) {
    return isTamil
      ? `பட்டறையில் ${activeWorkers.length} பணியாளர்கள் பணியாற்றுகின்றனர்: ${activeWorkers.map(w => w.name).join(', ') || 'யாரும் இல்லை'}.`
      : `You have ${activeWorkers.length} active workers: ${activeWorkers.map(w => w.name).join(', ') || 'None yet'}.`;
  }

  // Vehicles / Bore Rigs
  if (lower.includes('வண்டி') || lower.includes('rig') || lower.includes('bore') || lower.includes('vehicle') || lower.includes('போர்')) {
    return isTamil
      ? `பட்டறையில் பதிவு செய்யப்பட்ட போர் வண்டிகள் எண்ணிக்கை ${vehicles.length}.`
      : `You have ${vehicles.length} bore rig vehicles registered in the workshop.`;
  }

  // Why / Confusion / Clarification response
  if (lower.includes('why') || lower.includes('ஏன்') || lower.includes('என்ன சொல்ற') || lower.includes('puriyala') || lower.includes('not related') || lower.includes('cant get it') || lower.includes('புரியல')) {
    return isTamil
      ? 'மன்னிச்சுக்கோங்க! பணியாளர் சேர்க்க "பணியாளர் [பெயர்] சம்பளம் [தொகை] ரோல் [பதவி]" என்று சொல்லுங்க. உடனே பதிவு செய்கிறேன்.'
      : 'My apologies! To add or update an employee, you can say "Add employee [Name] role [Role] salary [Amount]", and I will register them right away.';
  }

  // Friendly Conversational Fallback
  return isTamil
    ? 'வணக்கம்! பட்டறையில் பணியாளர் சேர்க்கவா, வாடிக்கையாளர் பதியவா, அட்வான்ஸ் வரவு வைக்கவா, அல்லது பொதுவான கேள்விகள் கேட்கவா? சொல்லுங்க.'
    : 'How can I assist you? I can answer general knowledge questions, add employees, register customers, or manage workshop finances.';
}

// ═══════════════════════════════════════════════════════════
//  LIVE OPENAI / CHATGPT-STYLE CONVERSATIONAL AGENT
// ═══════════════════════════════════════════════════════════

export interface LiveChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actionExecuted?: string;
  timestamp: number;
}

export async function processLiveVoiceConversation(
  userUtterance: string,
  history: LiveChatMessage[],
  lang: 'ta-IN' | 'en-IN' = 'ta-IN'
): Promise<{ speech: string; actionExecuted?: string; updatedHistory: LiveChatMessage[] }> {
  const isTamil = lang === 'ta-IN';
  const cleanUtterance = userUtterance.trim();
  const lower = cleanUtterance.toLowerCase();

  // 1. Gather live database context snapshot
  let customers: Customer[] = [];
  let vehicles: Vehicle[] = [];
  let workers: Worker[] = [];
  let expenses: any[] = [];
  let payments: any[] = [];
  let parts: Part[] = [];

  try {
    const [c, v, w, e, p, pt] = await Promise.all([
      getAllCustomers(),
      getAllVehicles(),
      getAllWorkers(),
      getAllExpenses(),
      getAllPayments(),
      getAllParts(),
    ]);
    customers = c;
    vehicles = v;
    workers = w;
    expenses = e;
    payments = p;
    parts = pt;
  } catch (err) {
    console.warn('DB load error in live conversation:', err);
  }

  const activeWorkers = workers.filter(w => w.isActive);
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const contextSnapshot = `
Live Workshop Snapshot:
- Customers (${customers.length}): ${customers.slice(0, 10).map(c => `${c.name} (${c.phone || ''}, ${c.address || ''})`).join(', ') || 'None yet'}
- Vehicles / Bore Rigs (${vehicles.length}): ${vehicles.slice(0, 8).map(v => `${v.regNo} (${v.rigType || 'Rig'})`).join(', ') || 'None yet'}
- Workers (${activeWorkers.length}): ${activeWorkers.map(w => `${w.name} (${w.role})`).join(', ') || 'None yet'}
- Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}
- Total Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
- Low Stock Parts: ${parts.filter(p => p.stock <= p.minStock).map(p => `${p.name} (Qty: ${p.stock})`).join(', ') || 'All parts in stock'}
`.trim();

  const apiKey = await resolveGeminiKey(getSetting);

  // 3. Try Gemini Live Autonomous Conversation (if key exists)
  if (apiKey) {
    const systemPrompt = `You are MEW OS — a live, real-time conversational voice assistant (like ChatGPT Voice) for Mithra Engineering Works (MEW), a bore rig workshop in Tamil Nadu, India.

Your conversation style:
- Spoken, natural, friendly, and human.
- ${isTamil ? 'Speak naturally in Tamil (or conversational Tamil/Tanglish with English workshop words like customer, advance, lathe, diesel, GPay).' : 'Speak in clear, simple conversational English.'}
- Keep answers SHORT (1-2 sentences). They will be spoken aloud immediately over audio.
- DO NOT use bullet points, Markdown bold/italic, asterisks, or formatting symbols.

AUTONOMOUS CAPABILITY:
When the user wants to perform an action:
1. "Add Customer": Needs at least name. If phone or town mentioned, capture them. If only name given, you can ask for phone, OR register and confirm.
2. "Customer Advance": Needs customer name, amount, method (Cash/GPay).
3. "Expense": Needs description (e.g. lathe, diesel, welding), amount.
4. "Attendance": Needs worker name(s) and status (present/absent/half_day).

OUTPUT FORMAT:
Always return valid JSON ONLY with this schema:
{
  "speech": "Spoken sentence to reply to the user aloud",
  "action": null | {
    "type": "add_customer" | "customer_advance" | "vehicle_expense" | "worker_attendance" | "add_worker" | "update_worker" | "add_vehicle" | "add_supplier" | "pay_supplier" | "add_part" | "adjust_stock",
    "data": { ... }
  }
}

Action Data Schemas:
- add_customer: { "name": string, "phone": string, "address": string }
- customer_advance: { "customerName": string, "vehicleRegNo": string, "amount": number, "method": string, "note": string }
- vehicle_expense: { "customerName": string, "vehicleRegNo": string, "expenseType": "lathe_work" | "welding" | "diesel_fuel" | "hydraulic_hose" | "other", "amount": number, "method": string, "description": string }
- worker_attendance: { "workerName": string, "status": "present" | "absent" | "half_day" }
- add_worker: { "name": string, "role": string, "salary": number, "phone": string }
- update_worker: { "workerName": string, "role": string, "salary": number, "phone": string }
- add_vehicle: { "customerName": string, "regNo": string, "rigType": string }
- add_supplier: { "name": string, "phone": string, "address": string }
- pay_supplier: { "supplierName": string, "amount": number, "method": string, "note": string }
- add_part: { "name": string, "qty": number, "purchasePrice": number, "sellingPrice": number, "unit": string }
- adjust_stock: { "partName": string, "qty": number, "movementType": "purchase" | "adjustment" | "used_in_job" }

${contextSnapshot}`;

    const geminiHistory = history.slice(-6).map(msg => ({
      role: (msg.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      text: msg.text,
    }));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const result = await callGemini({
        systemPrompt,
        userMessage: cleanUtterance,
        apiKey,
        history: geminiHistory,
        temperature: 0.5,
        maxOutputTokens: 300,
        responseMimeType: 'application/json',
        abortSignal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (result) {
        let rawJson = result.text;
        if (rawJson) {
          if (rawJson.startsWith('```')) {
            rawJson = rawJson.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
          }
          try {
            const parsed = JSON.parse(rawJson);
            let actionBadge: string | undefined;

            if (parsed.action && parsed.action.type) {
              const act = parsed.action;
              if (act.type === 'add_customer' && act.data?.name) {
                await saveCustomer({
                  name: act.data.name,
                  phone: act.data.phone || '9999999999',
                  address: act.data.address || '',
                  whatsapp: act.data.phone || '',
                });
                actionBadge = `👤 வாடிக்கையாளர் சேர்க்கப்பட்டது: ${act.data.name}`;
                window.dispatchEvent(new CustomEvent('troyz_data_updated'));
              } else if (act.type === 'customer_advance' && act.data?.amount) {
                let cust = act.data.customerName ? customers.find(c => c.name.toLowerCase().includes((act.data.customerName || '').toLowerCase())) : null;
                let vehicle = act.data.vehicleRegNo ? vehicles.find(v => v.regNo.replace(/\s/g, '').toLowerCase().includes(act.data.vehicleRegNo.replace(/\s/g, '').toLowerCase())) : null;
                if (vehicle && !cust) {
                  cust = customers.find(c => c.id === vehicle?.customerId);
                }
                if (!cust && act.data.customerName) {
                  cust = await saveCustomer({ name: act.data.customerName, phone: '9999999999' });
                }
                if (cust) {
                  if (!vehicle) {
                    const custVehicles = vehicles.filter(v => v.customerId === cust?.id);
                    if (custVehicles.length > 0) vehicle = custVehicles[0];
                  }
                  await recordPayment({
                    customerId: cust.id,
                    vehicleId: vehicle?.id || undefined,
                    amount: Number(act.data.amount),
                    date: new Date().toISOString().split('T')[0],
                    method: (act.data.method || 'cash') as PaymentMethod,
                    paymentType: 'advance',
                    note: act.data.note || 'Advance payment',
                  });
                  actionBadge = `💰 அட்வான்ஸ் வரவு: ₹${Number(act.data.amount).toLocaleString('en-IN')} (${cust.name})`;
                  window.dispatchEvent(new CustomEvent('troyz_data_updated'));
                }
              } else if (act.type === 'vehicle_expense' && act.data?.amount) {
                let cust = act.data.customerName ? customers.find(c => c.name.toLowerCase().includes((act.data.customerName || '').toLowerCase())) : null;
                let vehicle = act.data.vehicleRegNo ? vehicles.find(v => v.regNo.replace(/\s/g, '').toLowerCase().includes(act.data.vehicleRegNo.replace(/\s/g, '').toLowerCase())) : null;
                if (vehicle && !cust) {
                  cust = customers.find(c => c.id === vehicle?.customerId);
                }
                if (!cust && act.data.customerName && act.data.customerName.length >= 2) {
                  cust = await saveCustomer({ name: act.data.customerName, phone: '9999999999' });
                }
                if (cust && !vehicle) {
                  const custVehicles = vehicles.filter(v => v.customerId === cust?.id);
                  if (custVehicles.length > 0) vehicle = custVehicles[0];
                }
                await saveExpense({
                  customerId: cust?.id || undefined,
                  vehicleId: vehicle?.id || undefined,
                  date: new Date().toISOString().split('T')[0],
                  category: 'customer_vehicle_direct' as ExpenseCategory,
                  expenseType: act.data.expenseType || 'lathe_work',
                  amount: Number(act.data.amount),
                  method: (act.data.method || 'cash') as PaymentMethod,
                  description: act.data.description || 'Workshop direct vehicle expense',
                });
                actionBadge = `🛠️ செலவு பதியப்பட்டது: ₹${Number(act.data.amount).toLocaleString('en-IN')}${cust ? ` (${cust.name})` : ''}`;
                window.dispatchEvent(new CustomEvent('troyz_data_updated'));
              } else if (act.type === 'worker_attendance' && act.data?.workerName) {
                const wObj = workers.find(w => w.name.toLowerCase().includes((act.data.workerName || '').toLowerCase()));
                if (wObj) {
                  await markAttendance({ workerId: wObj.id, date: new Date().toISOString().split('T')[0], status: (act.data.status || 'present') as 'present' | 'absent' | 'half_day' | 'holiday' });
                  actionBadge = `📋 வருகை: ${wObj.name} (${act.data.status || 'present'})`;
                  window.dispatchEvent(new CustomEvent('troyz_data_updated'));
                }
              } else if (act.type === 'add_worker' && act.data?.name) {
                await saveWorker({
                  name: act.data.name,
                  role: act.data.role || 'mechanic',
                  salary: Number(act.data.salary || 15000),
                  phone: act.data.phone || '',
                  joinDate: new Date().toISOString().split('T')[0],
                  isActive: true,
                });
                actionBadge = `👤 பணியாளர் சேர்க்கப்பட்டது: ${act.data.name}`;
                window.dispatchEvent(new CustomEvent('troyz_data_updated'));
              } else if (act.type === 'update_worker' && (act.data?.workerName || act.data?.name)) {
                const wName = act.data.workerName || act.data.name;
                const wObj = workers.find(w => w.name.toLowerCase().includes(wName.toLowerCase()));
                if (wObj) {
                  const upd: any = {};
                  if (act.data.role) upd.role = act.data.role;
                  if (act.data.salary) upd.salary = Number(act.data.salary);
                  if (act.data.phone) upd.phone = act.data.phone;
                  await updateWorker(wObj.id, upd);
                  actionBadge = `👤 புதுப்பிக்கப்பட்டது: ${wObj.name}`;
                  window.dispatchEvent(new CustomEvent('troyz_data_updated'));
                }
              } else if (act.type === 'add_vehicle' && act.data?.regNo) {
                let cust = customers.find(c => c.name.toLowerCase().includes((act.data.customerName || '').toLowerCase()));
                if (!cust && act.data.customerName) {
                  cust = await saveCustomer({ name: act.data.customerName, phone: '9999999999' });
                }
                await saveVehicle({
                  customerId: cust?.id || '',
                  regNo: act.data.regNo,
                  rigType: act.data.rigType || 'DTH Rig',
                  make: act.data.make || 'Ashok Leyland',
                  model: act.data.model || 'PRD 1000',
                  compressorDetails: act.data.compressorDetails || 'ELGi 1100 CFM',
                });
                actionBadge = `🚜 போர் வண்டி சேர்க்கப்பட்டது: ${act.data.regNo}`;
                window.dispatchEvent(new CustomEvent('troyz_data_updated'));
              } else if (act.type === 'add_supplier' && act.data?.name) {
                await saveSupplier({
                  name: act.data.name,
                  phone: act.data.phone || '',
                  address: act.data.address || '',
                  totalPurchased: 0,
                  totalPaid: 0,
                  balance: 0,
                });
                actionBadge = `🏪 சப்ளையர் சேர்க்கப்பட்டது: ${act.data.name}`;
                window.dispatchEvent(new CustomEvent('troyz_data_updated'));
              } else if (act.type === 'pay_supplier' && act.data?.amount) {
                const suppliers = await getAllSuppliers();
                const supp = suppliers.find(s => s.name.toLowerCase().includes((act.data.supplierName || '').toLowerCase()));
                if (supp) {
                  await paySupplier({
                    supplierId: supp.id,
                    amount: Number(act.data.amount),
                    method: (act.data.method || 'cash') as PaymentMethod,
                    note: act.data.note || 'Payment via voice',
                  });
                  actionBadge = `🏪 சப்ளையர் பணம்: ₹${Number(act.data.amount).toLocaleString('en-IN')} (${supp.name})`;
                  window.dispatchEvent(new CustomEvent('troyz_data_updated'));
                }
              } else if (act.type === 'add_part' && act.data?.name) {
                await savePart({
                  sku: act.data.sku || `SKU-${Date.now().toString().slice(-4)}`,
                  name: act.data.name,
                  purchasePrice: Number(act.data.purchasePrice || 0),
                  sellingPrice: Number(act.data.sellingPrice || act.data.purchasePrice || 0),
                  stock: Number(act.data.qty || act.data.stock || 1),
                  minStock: Number(act.data.minStock || 2),
                  unit: act.data.unit || 'Piece',
                });
                actionBadge = `📦 உதிரிபாகம்: ${act.data.name}`;
                window.dispatchEvent(new CustomEvent('troyz_data_updated'));
              } else if (act.type === 'adjust_stock' && act.data?.partName && act.data?.qty) {
                const parts = await getAllParts();
                const part = parts.find(p => p.name.toLowerCase().includes(act.data.partName.toLowerCase()));
                if (part) {
                  await adjustStock(part.id, (act.data.movementType || 'purchase') as any, Number(act.data.qty), act.data.note || 'Stock update via voice');
                  actionBadge = `📦 ஸ்டாக் புதுப்பிக்கப்பட்டது: ${part.name} (${act.data.qty})`;
                  window.dispatchEvent(new CustomEvent('troyz_data_updated'));
                }
              }
            }

            const speechText = parsed.speech || (isTamil ? 'சரிங்க!' : 'Done!');
            const userMsg: LiveChatMessage = {
              id: 'u_' + Date.now(),
              role: 'user',
              text: cleanUtterance,
              timestamp: Date.now(),
            };
            const assistantMsg: LiveChatMessage = {
              id: 'a_' + Date.now(),
              role: 'assistant',
              text: speechText,
              actionExecuted: actionBadge,
              timestamp: Date.now(),
            };

            return {
              speech: speechText,
              actionExecuted: actionBadge,
              updatedHistory: [...history, userMsg, assistantMsg],
            };
          } catch (jsonErr) {
            console.warn('Could not parse Gemini JSON response:', jsonErr, rawJson);
            const fallbackSpeech = String(rawJson || '').replace(/[{}"\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
            if (fallbackSpeech) {
              const userMsg: LiveChatMessage = {
                id: 'u_' + Date.now(),
                role: 'user',
                text: cleanUtterance,
                timestamp: Date.now(),
              };
              const assistantMsg: LiveChatMessage = {
                id: 'a_' + Date.now(),
                role: 'assistant',
                text: fallbackSpeech,
                timestamp: Date.now(),
              };
              return {
                speech: fallbackSpeech,
                updatedHistory: [...history, userMsg, assistantMsg],
              };
            }
          }
        }
      }
    } catch (geminiErr) {
      console.warn('Gemini live stream error:', geminiErr);
    }
  }

  // 4. Local High-Speed Conversational Brain (100% Free & Offline)
  let speech = '';
  let actionExecuted: string | undefined;

  const amount = extractAmount(lower);
  const phone = extractPhone(lower);
  const regNo = extractRegNo(cleanUtterance);
  const method = extractMethod(lower);

  // Helper role extractor
  const extractRole = (s: string) => {
    const l = s.toLowerCase();
    if (l.includes('lathe') || l.includes('turning') || l.includes('லேத்')) return 'lathe_operator';
    if (l.includes('welder') || l.includes('welding') || l.includes('வெல்டர்') || l.includes('வெல்டிங்')) return 'welder';
    if (l.includes('electrician') || l.includes('கரண்ட்') || l.includes('எலக்ட்ரீசியன்') || l.includes('எலக்ட்ரீஷியன்')) return 'electrician';
    if (l.includes('painter') || l.includes('பெயிண்டர்')) return 'painter';
    if (l.includes('helper') || l.includes('உதவியாளர்') || l.includes('ஹெல்பர்')) return 'helper';
    if (l.includes('supervisor') || l.includes('சூப்பர்வைசர்')) return 'supervisor';
    if (l.includes('manager') || l.includes('மேனேஜர்')) return 'manager';
    if (l.includes('driver') || l.includes('டிரைவர்')) return 'driver';
    if (l.includes('mechanic') || l.includes('மெக்கானிக்')) return 'mechanic';
    return '';
  };

  const role = extractRole(lower);

  // Multi-turn context: inspect what the assistant previously asked or discussed
  const lastAssistantMsg = history.length > 0
    ? history.filter(h => h.role === 'assistant').slice(-1)[0]?.text || ''
    : '';
  const lastAssistantLower = lastAssistantMsg.toLowerCase();

  const isFollowUpForWorkerRoleOrSalary = lastAssistantLower.includes('பதவி') ||
    lastAssistantLower.includes('role and salary') ||
    lastAssistantLower.includes('பணியாளர்') ||
    lastAssistantLower.includes('employee');

  const isWorkerKey = lower.includes('worker') || lower.includes('employee') || lower.includes('பணியாளர்') || lower.includes('ஆட்கள்') || lower.includes('வேலையாள்') || lower.includes('ஆள்') || lower.includes('ஸ்டாஃப்') || lower.includes('staff');
  const isSalaryOrRole = lower.includes('salary') || lower.includes('சம்பளம்') || lower.includes('role') || lower.includes('பதவி') || lower.includes('கூலி') || lower.includes('wage') || (role !== '');

  // ─── Flow 1: Worker / Employee Update (Role, Salary, Phone) ───
  if (isSalaryOrRole && !lower.includes('lathe work') && !lower.includes('turning job') && !lower.includes('expense') && !lower.includes('செலவு')) {
    // Find target worker from utterance or from last added worker
    let cleanTarget = cleanUtterance
      .replace(/his|her|their|salary|role|is|for|அவரோட|சம்பளம்|பதவி|ரோல்|ரூபாய்|rs|[0-9,]+/gi, '')
      .replace(/lathe|operator|welder|mechanic|electrician|helper|driver|supervisor|லேத்|வெல்டர்|மெக்கானிக்/gi, '')
      .replace(/^[,\s-]+|[,\s-]+$/g, '')
      .trim();

    let targetWorkerObj = (cleanTarget.length >= 2 && cleanTarget.toLowerCase() !== 'employee' && cleanTarget.toLowerCase() !== 'worker')
      ? workers.find(w => w.name.toLowerCase().includes(cleanTarget.toLowerCase()))
      : null;

    if (!targetWorkerObj && workers.length > 0) {
      targetWorkerObj = workers[workers.length - 1];
    }

    if (targetWorkerObj) {
      const updates: Partial<Worker> = {};
      if (role) updates.role = role as any;
      if (amount > 0) updates.salary = amount;
      if (phone) updates.phone = phone;

      await updateWorker(targetWorkerObj.id, updates);
      const roleStr = role ? role.replace('_', ' ') : targetWorkerObj.role;
      const salStr = amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : `₹${targetWorkerObj.salary.toLocaleString('en-IN')}`;

      actionExecuted = `👤 ${targetWorkerObj.name}: ${roleStr} (${salStr})`;
      speech = isTamil
        ? `${targetWorkerObj.name} விவரங்கள் புதுப்பிக்கப்பட்டன: பதவி ${roleStr}, சம்பளம் ${salStr}.`
        : `Updated ${targetWorkerObj.name}: Role set to ${roleStr}, Salary ${salStr}.`;

      window.dispatchEvent(new CustomEvent('troyz_data_updated'));
    }
  }

  // ─── Flow 2: Add Worker / Employee ───
  else if (isWorkerKey && (lower.includes('add') || lower.includes('create') || lower.includes('new') || lower.includes('சேர்க்க') || lower.includes('பதிவு') || lower.includes('புது') || lower.includes('புதிய') || lower.includes('பணியாளர்'))) {
    let cleanName = cleanUtterance
      .replace(/pudhu|new|add|create|worker|employee|staff|பணியாளர்|வேலையாள்|ஆள்|நியூ|புதிய|புது|சேர்க்க|பதிவு|register/gi, '')
      .replace(/salary|role|சம்பளம்|பதவி|ரூபாய்|rs|[0-9,]+/gi, '')
      .replace(/lathe|operator|welder|mechanic|electrician|helper|driver|supervisor|லேத்|வெல்டர்|மெக்கானிக்/gi, '')
      .replace(/[0-9]{10}/g, '')
      .replace(/^[,\s-]+|[,\s-]+$/g, '')
      .trim();

    const finalRole = (role || 'mechanic') as any;
    const finalSalary = amount > 0 ? amount : 15000;

    if (cleanName && cleanName.length >= 2) {
      await saveWorker({
        name: cleanName,
        role: finalRole,
        salary: finalSalary,
        phone: phone || '',
        joinDate: new Date().toISOString().split('T')[0],
        isActive: true,
      });

      const roleStr = finalRole.replace('_', ' ');
      actionExecuted = `👤 புதிய பணியாளர்: ${cleanName} (${roleStr})`;
      speech = isTamil
        ? (amount > 0 || role
            ? `பணியாளர் ${cleanName} சேர்க்கப்பட்டார்: பதவி ${roleStr}, சம்பளம் ₹${finalSalary.toLocaleString('en-IN')}.`
            : `பணியாளர் ${cleanName} சேர்க்கப்பட்டார். அவரது பதவி (Role) மற்றும் சம்பளம் சொல்லுங்க?`)
        : (amount > 0 || role
            ? `Added employee ${cleanName} as ${roleStr} with salary ₹${finalSalary.toLocaleString('en-IN')}.`
            : `Added employee ${cleanName}! What is his role and salary?`);

      window.dispatchEvent(new CustomEvent('troyz_data_updated'));
    } else {
      speech = isTamil
        ? `சரிங்க, சேர்க்க வேண்டிய பணியாளர் பெயர் சொல்லுங்க?`
        : `Sure, what is the employee name?`;
    }
  }

  // ─── Flow 3: Add Customer ───
  else if (lower.includes('customer') || lower.includes('வாடிக்கையாளர்') || lower.includes('கஸ்டமர்') || lower.includes('client')) {
    let cleanName = cleanUtterance
      .replace(/pudhu|new|add|customer|client|வாடிக்கையாளர்|கஸ்டமர்|நியூ|புதிய|புது|சேர்க்க|பதிவு|register|create/gi, '')
      .replace(/(?:phone|mobile|போன்|எண்|number)\s*[0-9]+/gi, '')
      .replace(/[0-9]{10}/g, '')
      .replace(/namakkal|salem|chennai|tiruchengode|erode/gi, '')
      .replace(/^[,\s-]+|[,\s-]+$/g, '')
      .trim();

    if (cleanName && cleanName.length >= 2) {
      await saveCustomer({
        name: cleanName,
        phone: phone || '9999999999',
        address: lower.includes('salem') ? 'Salem' : lower.includes('namakkal') ? 'Namakkal' : '',
        whatsapp: phone || '',
      });
      actionExecuted = `👤 புதிய வாடிக்கையாளர்: ${cleanName}`;
      speech = isTamil
        ? `வாடிக்கையாளர் ${cleanName} ${phone ? `(போன்: ${phone})` : ''} வெற்றிகரமாக பதிவு செய்யப்பட்டார்.`
        : `Registered customer ${cleanName} ${phone ? `with phone ${phone}` : ''} successfully.`;
      window.dispatchEvent(new CustomEvent('troyz_data_updated'));
    } else {
      speech = isTamil
        ? `சரிங்க, வாடிக்கையாளர் பெயர் மற்றும் போன் நம்பர் சொல்லுங்க?`
        : `Sure, what is the customer's name and phone number?`;
    }
  }

  // ─── Flow 4: Customer Advance ───
  else if (lower.includes('advance') || lower.includes('அட்வான்ஸ்') || lower.includes('varavu') || lower.includes('வரவு')) {
    let matchedCust = customers.find(c => lower.includes(c.name.toLowerCase()));
    let custName = matchedCust?.name;
    if (!custName) {
      const clean = cleanUtterance
        .replace(/advance|advans|adv|varavu|வரவு|அட்வான்ஸ்|paid|payment|gpay|cash|upi|[0-9,]+/gi, '')
        .replace(/^[,\s-]+|[,\s-]+$/g, '')
        .trim();
      if (clean && clean.length > 2) custName = clean;
    }

    if (custName && amount > 0) {
      if (!matchedCust) {
        matchedCust = await saveCustomer({ name: custName, phone: '9999999999' });
      }
      await recordPayment({
        customerId: matchedCust.id,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        method: (method || 'cash') as PaymentMethod,
        paymentType: 'advance',
        note: 'Customer advance payment',
      });
      actionExecuted = `💰 அட்வான்ஸ் வரவு: ₹${amount.toLocaleString('en-IN')} (${matchedCust.name})`;
      speech = isTamil
        ? `${matchedCust.name} அட்வான்ஸ் ₹${amount.toLocaleString('en-IN')} ${method.toUpperCase()} மூலம் கணக்கில் சேர்த்தாச்சு.`
        : `Recorded ₹${amount.toLocaleString('en-IN')} advance from ${matchedCust.name} via ${method.toUpperCase()}.`;
      window.dispatchEvent(new CustomEvent('troyz_data_updated'));
    } else {
      speech = isTamil
        ? `அட்வான்ஸ் பதிய எந்த வாடிக்கையாளர் மற்றும் எவ்வளவு தொகை என்று சொல்லுங்க?`
        : `Please specify which customer and the advance amount to record.`;
    }
  }

  // ─── Flow 5: Workshop Expense (Lathe, Welding, Diesel, Vehicle Parts) ───
  else if (!isSalaryOrRole && !isWorkerKey && (lower.includes('diesel') || lower.includes('டீசல்') || lower.includes('expense') || lower.includes('செலவு') || lower.includes('selavu') || lower.includes('lathe work') || lower.includes('welding work') || lower.includes('spares') || lower.includes('வண்டி செலவு') || lower.includes('lorry') || lower.includes('rig'))) {
    let expType = 'lathe_work';
    if (lower.includes('diesel') || lower.includes('டீசல்')) expType = 'diesel_fuel';
    else if (lower.includes('welding') || lower.includes('வெல்டிங்')) expType = 'welding';
    else if (lower.includes('spares') || lower.includes('parts')) expType = 'spares_purchase';

    // Find if a customer or vehicle was referenced
    let matchedCust = customers.find(c => lower.includes(c.name.toLowerCase()));
    let matchedVehicle = vehicles.find(v => lower.includes(v.regNo.replace(/\s/g, '').toLowerCase()));
    
    if (matchedVehicle && !matchedCust) {
      matchedCust = customers.find(c => c.id === matchedVehicle?.customerId);
    }
    if (matchedCust && !matchedVehicle) {
      const custVehicles = vehicles.filter(v => v.customerId === matchedCust?.id);
      if (custVehicles.length > 0) matchedVehicle = custVehicles[0];
    }

    if (amount > 0) {
      await saveExpense({
        customerId: matchedCust?.id || undefined,
        vehicleId: matchedVehicle?.id || undefined,
        date: new Date().toISOString().split('T')[0],
        category: matchedCust ? 'customer_vehicle_direct' as ExpenseCategory : 'workshop_overhead' as ExpenseCategory,
        expenseType: expType,
        amount: amount,
        method: (method || 'cash') as PaymentMethod,
        description: cleanUtterance,
      });
      actionExecuted = `🛠️ செலவு: ₹${amount.toLocaleString('en-IN')}${matchedCust ? ` (${matchedCust.name})` : ''}`;
      speech = isTamil
        ? `செலவு ₹${amount.toLocaleString('en-IN')}${matchedCust ? ` (${matchedCust.name} வண்டிக்கு)` : ''} கணக்கில் பதியப்பட்டது.`
        : `Recorded expense of ₹${amount.toLocaleString('en-IN')}${matchedCust ? ` for ${matchedCust.name}` : ''} successfully.`;
      window.dispatchEvent(new CustomEvent('troyz_data_updated'));
    } else {
      speech = isTamil
        ? `செலவு பதிய என்ன வேலை மற்றும் தொகை எவ்வளவு என்று சொல்லுங்க?`
        : `Please tell me what work was done and the expense amount.`;
    }
  }

  // ─── Flow 6: Attendance ───
  else if (lower.includes('present') || lower.includes('absent') || lower.includes('ஆப்சன்ட்') || lower.includes('பிரசண்ட்') || lower.includes('லீவு') || lower.includes('attendance') || lower.includes('வருகை')) {
    // Robust worker matching supporting English, Tamil, and substrings
    let matchedWorker = workers.find(w => {
      const wn = w.name.toLowerCase();
      return lower.includes(wn) || wn.split(' ').some(part => part.length >= 3 && lower.includes(part));
    });

    // If only 1 active worker exists in workshop, pick them
    if (!matchedWorker && workers.filter(w => w.isActive).length === 1) {
      matchedWorker = workers.filter(w => w.isActive)[0];
    }

    const status: 'present' | 'absent' | 'half_day' =
      (lower.includes('absent') || lower.includes('ஆப்சன்ட்') || lower.includes('லீவு')) ? 'absent' : 'present';

    if (matchedWorker) {
      await markAttendance({ workerId: matchedWorker.id, date: new Date().toISOString().split('T')[0], status });
      actionExecuted = `📋 வருகை: ${matchedWorker.name} (${status === 'present' ? 'பிரசண்ட்' : 'ஆப்சன்ட்'})`;
      speech = isTamil
        ? `${matchedWorker.name} வருகை (${status === 'present' ? 'பிரசண்ட்' : 'ஆப்சன்ட்'}) வெற்றிகரமாக பதிவு செய்யப்பட்டது.`
        : `Marked ${matchedWorker.name} as ${status} for today.`;
      window.dispatchEvent(new CustomEvent('troyz_data_updated'));
    } else {
      // Try to extract potential name from utterance
      const candidateName = cleanUtterance
        .replace(/present|absent|attendance|today|mark|பிரசண்ட்|ஆப்சன்ட்|லீவு|வருகை|இன்று/gi, '')
        .replace(/^[,\s-]+|[,\s-]+$/g, '')
        .trim();
      
      if (candidateName && candidateName.length >= 2 && workers.length > 0) {
        const found = workers.find(w => w.name.toLowerCase().includes(candidateName.toLowerCase()) || candidateName.toLowerCase().includes(w.name.toLowerCase()));
        if (found) {
          await markAttendance({ workerId: found.id, date: new Date().toISOString().split('T')[0], status });
          actionExecuted = `📋 வருகை: ${found.name} (${status})`;
          speech = isTamil
            ? `${found.name} வருகை (${status === 'present' ? 'பிரசண்ட்' : 'ஆப்சன்ட்'}) பதிவு செய்யப்பட்டது.`
            : `Marked ${found.name} as ${status} for today.`;
          window.dispatchEvent(new CustomEvent('troyz_data_updated'));
        } else {
          speech = isTamil
            ? `யாருக்கு வருகை பதிய வேண்டும்? பணியாளர் பெயர் சொல்லுங்க.`
            : `Who would you like to mark attendance for?`;
        }
      } else {
        speech = isTamil
          ? `யாருக்கு வருகை பதிய வேண்டும்? பணியாளர் பெயர் சொல்லுங்க (உதாரணம்: ரமேஷ் பிரசண்ட்).`
          : `Who would you like to mark attendance for? (e.g. Ramesh present)`;
      }
    }
  }

  // ─── Flow 7: Conversational Assistant Brain ───
  else {
    speech = await askTroyz(cleanUtterance, lang);
  }

  // Ensure speech is never empty
  if (!speech || !speech.trim()) {
    speech = isTamil
      ? 'சரிங்க, மறுபடியும் சொல்லுங்க.'
      : 'Okay, please repeat that.';
  }

  const userMsg: LiveChatMessage = {
    id: 'u_' + Date.now(),
    role: 'user',
    text: cleanUtterance,
    timestamp: Date.now(),
  };
  const assistantMsg: LiveChatMessage = {
    id: 'a_' + Date.now(),
    role: 'assistant',
    text: speech,
    actionExecuted,
    timestamp: Date.now(),
  };

  return {
    speech,
    actionExecuted,
    updatedHistory: [...history, userMsg, assistantMsg],
  };
}
