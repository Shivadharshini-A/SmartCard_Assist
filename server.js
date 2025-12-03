// server.js
// MediAssist – Node.js backend with lifetime medical history + SHORT Gemini chatbot replies + Diet Plan + Case Studies + Diet PDF

const express = require("express");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PDFDocument = require("pdfkit"); // <-- NEW: for PDF generation

const app = express();
const port = 5000;

// --------------------------------------------------------
// GEMINI SETUP – PUT YOUR API KEY HERE
// --------------------------------------------------------
const GEMINI_API_KEY = "YOUR_REAL_API_KEY_HERE"; // <<< PASTE YOUR KEY EXACTLY HERE

if (!GEMINI_API_KEY) {
  console.warn("⚠ GEMINI_API_KEY is empty! Chatbot will not work.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --------------------------------------------------------
// EXPRESS MIDDLEWARE
// --------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --------------------------------------------------------
// IN-MEMORY "DATABASE" – PATIENTS
// (same as before – shortened comment, content unchanged)
// --------------------------------------------------------
const patients = {
  // CARD 1 – John Doe (Diabetes + HTN + Throat infection)
  "62:40:47:5C": {
    uid: "62:40:47:5C",
    id: "P001",
    name: "John Doe",
    age: 55,
    gender: "Male",

    disease: "Diabetes, Hypertension (Chronic) + Throat Infection (Acute)",

    medical: {
      lifelong: {
        birthHistory: "Full-term normal delivery, no NICU stay.",
        childhoodIllnesses: [
          "Measles at age 5",
          "Frequent throat infections during school age"
        ],
        vaccinations: {
          upToDate: true,
          notes: "All primary vaccinations completed as per schedule."
        },
        allergies: [
          "Mild allergy to dust",
          "No known drug allergy"
        ]
      },

      chronic: [
        {
          name: "Type 2 Diabetes Mellitus",
          diagnosedOn: "2010-06-15",
          status: "On medication",
          remarks: "On insulin therapy, regular blood sugar monitoring."
        },
        {
          name: "Hypertension",
          diagnosedOn: "2012-03-20",
          status: "Controlled",
          remarks: "On ACE inhibitors."
        }
      ],

      episodes: [
        {
          date: "2018-08-10",
          type: "Injury",
          diagnosis: "Right ankle sprain",
          reason: "Sports injury",
          admitted: false,
          ward: null,
          treatment: "Rest, ice, compression bandage, painkillers.",
          outcome: "Recovered fully."
        },
        {
          date: "2023-11-25",
          type: "Acute Illness",
          diagnosis: "Viral fever",
          symptoms: ["High fever", "Headache", "Body pain"],
          admitted: false,
          ward: null,
          treatment: "Paracetamol, hydration, rest.",
          outcome: "Recovered in 4 days."
        },
        {
          date: "2025-02-10",
          type: "Acute Illness",
          diagnosis: "Throat infection",
          symptoms: ["Sore throat", "Dry cough", "Mild fever"],
          admitted: true,
          ward: "General - 3B",
          treatment: "Antibiotics, warm saline gargle.",
          outcome: "Under treatment."
        }
      ],

      currentVisit: {
        visitDate: "2025-02-10",
        reasonForVisit: "Throat infection with history of diabetes",
        consultedFor: [
          "Throat pain",
          "Difficulty swallowing",
          "Mild cough"
        ],
        currentDiagnosis: {
          primary: "Acute throat infection",
          secondary: ["Type 2 Diabetes Mellitus", "Hypertension"]
        },
        currentStatus: "Admitted",
        severity: "Moderate",
        plan: [
          "Antibiotics for 5 days",
          "Monitor blood sugar closely",
          "Regular gargling and steam inhalation"
        ]
      }
    },

    // DIET PLAN – Diabetes + Hypertension + Throat infection
    dietPlan: {
      goal: "Control blood sugar and blood pressure, support throat recovery.",
      calories: "Approx. 1600–1800 kcal/day",
      pattern: "3 main meals + 2 small snacks",
      meals: {
        breakfast: [
          "1–2 small phulkas / 2 slices whole wheat bread",
          "1 bowl vegetable upma / oats porridge (no sugar)",
          "Unsweetened tea/coffee or lemon water"
        ],
        midMorning: [
          "1 small fruit: apple/guava/papaya (no banana, no mango)",
          "Plain water or herbal tea"
        ],
        lunch: [
          "2–3 phulkas / 1 cup brown rice",
          "1 bowl dal (less oil & salt)",
          "1 bowl mixed vegetable sabji",
          "Salad: cucumber, tomato, carrot"
        ],
        eveningSnack: [
          "Roasted chana / handful of nuts (unsalted)",
          "Green tea or lemon water (no sugar)"
        ],
        dinner: [
          "2 phulkas or 1 bowl vegetable soup + 1 small phulka",
          "Light sabji (lauki, tinda, beans, etc.)",
          "Avoid heavy/oily food at night"
        ]
      },
      avoid: [
        "Sugary drinks, sweets, bakery items",
        "Very salty foods, pickles, papad",
        "Fried items (samosa, chips, bhajji)",
        "Cold drinks and very spicy food (can worsen throat)"
      ],
      extra: [
        "Sip warm water frequently for throat comfort.",
        "Do not skip meals – maintain regular timing.",
        "Limit added salt and sugar strictly.",
        "Consult doctor/dietician before any major change."
      ]
    },

    admitted_from: "2025-02-10",
    admitted_to: "2025-02-14",
    ward: "General - 3B",
    notes: "On antibiotics and warm saline gargle. Monitor temperature and hydration."
  },

  // CARD 2 – Mary Jane
  "13:24:3F:E4": {
    uid: "13:24:3F:E4",
    id: "P002",
    name: "Mary Jane",
    age: 43,
    gender: "Female",

    disease: "Chronic Kidney Disease + Viral Fever",

    medical: {
      lifelong: {
        birthHistory: "Preterm birth at 36 weeks, brief NICU observation.",
        childhoodIllnesses: [
          "Frequent cough and cold",
          "Tonsillitis in childhood"
        ],
        vaccinations: {
          upToDate: true,
          notes: "Adult booster vaccines taken."
        },
        allergies: [
          "Allergy to some NSAIDs",
          "Lactose intolerance"
        ]
      },

      chronic: [
        {
          name: "Chronic Kidney Disease (Stage 3)",
          diagnosedOn: "2018-04-01",
          status: "Under regular nephrology follow-up",
          remarks: "Dialysis twice a week."
        },
        {
          name: "Anemia",
          diagnosedOn: "2019-09-10",
          status: "Stable",
          remarks: "On supplements, monitored."
        }
      ],

      episodes: [
        {
          date: "2020-01-15",
          type: "Acute Illness",
          diagnosis: "Throat infection",
          symptoms: ["Sore throat", "Fever"],
          admitted: false,
          ward: null,
          treatment: "Antibiotics, rest.",
          outcome: "Recovered."
        },
        {
          date: "2023-07-05",
          type: "Post-surgery recovery",
          diagnosis: "Post minor abdominal surgery",
          symptoms: ["Pain at incision site"],
          admitted: true,
          ward: "Surgical - 4D",
          treatment: "Post-op care, pain management.",
          outcome: "Recovered over 2 weeks."
        },
        {
          date: "2025-02-12",
          type: "Acute Illness",
          diagnosis: "Viral fever",
          symptoms: ["High fever", "Body pain", "Headache", "Weakness"],
          admitted: true,
          ward: "ICU - 2A",
          treatment: "Antipyretics, IV fluids, CKD-compatible medication.",
          outcome: "Under treatment."
        }
      ],

      currentVisit: {
        visitDate: "2025-02-12",
        reasonForVisit: "High-grade fever in CKD patient",
        consultedFor: [
          "Fever",
          "Severe weakness",
          "Body pain"
        ],
        currentDiagnosis: {
          primary: "Viral fever",
          secondary: ["Chronic Kidney Disease", "Anemia"]
        },
        currentStatus: "ICU – Under observation",
        severity: "High",
        plan: [
          "Continue dialysis schedule",
          "Monitor electrolytes and kidney function",
          "Taper fever with appropriate drugs"
        ]
      }
    },

    dietPlan: {
      goal: "Protect kidney function, control fluid and electrolyte load, support recovery from fever.",
      calories: "Approx. 1500–1700 kcal/day (as per nephrologist)",
      pattern: "Small, frequent meals; controlled fluid intake.",
      meals: {
        breakfast: [
          "1–2 slices white/brown bread (as allowed)",
          "Low-potassium fruits if permitted (apple, pear – small portion)",
          "Unsalted butter or simple spread in limited amount"
        ],
        midMorning: [
          "Plain water or prescribed fluid as per doctor",
          "Light snack like toasted bread / khakra (low salt)"
        ],
        lunch: [
          "Measured portion of rice/chapati (as per renal diet plan)",
          "1 bowl low-potassium vegetables (lauki, tinda, beans – boiled & drained)",
          "Limited dal or protein as advised by nephrologist"
        ],
        eveningSnack: [
          "Plain biscuit / rusk (low salt)",
          "Herbal tea without milk and sugar (if allowed)"
        ],
        dinner: [
          "Light khichdi with more rice and less dal OR soft chapati with sabji",
          "Avoid heavy protein at night unless advised",
          "Easy-to-digest foods to reduce strain on kidneys"
        ]
      },
      avoid: [
        "High potassium foods: banana, orange, coconut water, potato (unless prepared specially)",
        "Very salty foods: pickles, papad, chips",
        "High-protein heavy meals without nephrologist advice",
        "Carbonated soft drinks and packaged juices"
      ],
      extra: [
        "Fluid intake must follow nephrologist’s exact advice.",
        "Daily weight monitoring to track fluid overload.",
        "Avoid self-adding salt on top of food.",
        "Diet must be regularly reviewed by renal dietician."
      ]
    },

    admitted_from: "2025-02-12",
    admitted_to: "2025-02-20",
    ward: "ICU - 2A",
    notes: "On antipyretics and IV fluids. Dialysis schedule to be maintained."
  },

  // CARD 3 – Rahul Verma
  "A1:A8:43:48": {
    uid: "A1:A8:43:48",
    id: "P003",
    name: "Rahul Verma",
    age: 29,
    gender: "Male",

    disease: "Dengue Fever + General Weakness + Past Injury",

    medical: {
      lifelong: {
        birthHistory: "Normal delivery, no complications.",
        childhoodIllnesses: [
          "Chickenpox at age 7"
        ],
        vaccinations: {
          upToDate: true,
          notes: "All standard vaccines done."
        },
        allergies: [
          "No known allergies"
        ]
      },

      chronic: [],

      episodes: [
        {
          date: "2019-06-20",
          type: "Injury",
          diagnosis: "Minor head injury",
          reason: "Two-wheeler accident",
          admitted: true,
          ward: "Trauma - 1A",
          treatment: "Observation, pain management, CT scan normal.",
          outcome: "Stable, discharged after 2 days."
        },
        {
          date: "2025-02-15",
          type: "Acute Illness",
          diagnosis: "Dengue Fever",
          symptoms: [
            "High fever",
            "Platelet count dropping",
            "Severe weakness"
          ],
          admitted: true,
          ward: "Isolation - 1C",
          treatment: "Dengue protocol, IV fluids, regular CBC monitoring.",
          outcome: "Under treatment."
        }
      ],

      currentVisit: {
        visitDate: "2025-02-15",
        reasonForVisit: "High fever with suspected dengue",
        consultedFor: [
          "Fever",
          "Weakness",
          "Body pain"
        ],
        currentDiagnosis: {
          primary: "Dengue Fever (confirmed)",
          secondary: []
        },
        currentStatus: "Admitted in Isolation",
        severity: "High",
        plan: [
          "Monitor platelet count daily",
          "Hydration and rest",
          "Avoid NSAIDs"
        ]
      }
    },

    dietPlan: {
      goal: "Maintain hydration, support platelet recovery, easy digestion.",
      calories: "Approx. 1800 kcal/day (as tolerated)",
      pattern: "Frequent small meals + high fluids (as per doctor).",
      meals: {
        breakfast: [
          "Idli / soft upma / poha with minimal oil",
          "Tender coconut water or ORS (if doctor allows)",
          "Soft fruits like papaya in small portion"
        ],
        midMorning: [
          "Fresh fruit juice (no added sugar) if allowed",
          "ORS / lemon water with a pinch of salt and sugar (if advised)"
        ],
        lunch: [
          "Soft rice or khichdi with moong dal (light, non-spicy)",
          "Boiled vegetables, lightly seasoned",
          "Curd (if no contraindication)"
        ],
        eveningSnack: [
          "Soups: vegetable soup / clear soup",
          "Light biscuit or toast"
        ],
        dinner: [
          "Light khichdi or dal rice in small quantity",
          "Vegetable soup or clear broth",
          "Avoid very spicy or fried food"
        ]
      },
      avoid: [
        "Fried foods and heavy oily dishes",
        "Very spicy food that irritates stomach",
        "Alcohol, energy drinks, and soft drinks",
        "Unhygienic street food"
      ],
      extra: [
        "Maintain good hydration as per doctor’s advice.",
        "Take rest; avoid strenuous activity.",
        "Watch for bleeding, black stool, or red spots – report immediately.",
        "Diet should be updated as platelet count and energy improve."
      ]
    },

    admitted_from: "2025-02-15",
    admitted_to: "2025-02-22",
    ward: "Isolation - 1C",
    notes: "Monitor platelets daily, maintain hydration, avoid NSAIDs."
  }
};

// --------------------------------------------------------
// CASE STUDIES (same as before)
// --------------------------------------------------------
const caseStudies = [
  {
    id: "CS01",
    title: "Diabetic patient with throat infection",
    conditions: ["Diabetes", "Hypertension", "Throat infection"],
    summary:
      "55-year-old male with long-standing diabetes and hypertension presented with sore throat and mild fever.",
    management:
      "Started on mild antibiotics, sugar monitoring 4 times/day, BP closely tracked, warm saline gargles, soft diet.",
    learningPoints: [
      "Always check sugar more often during infections.",
      "Throat infections can destabilize BP and sugars.",
      "Hydration and soft food improve comfort and recovery."
    ]
  },
  {
    id: "CS02",
    title: "CKD Stage 3 with viral fever",
    conditions: ["Chronic Kidney Disease", "Viral fever"],
    summary:
      "Middle-aged female with CKD Stage 3 came with high fever and weakness.",
    management:
      "Antipyretics adjusted for kidney function, fluids strictly monitored, regular kidney function tests, nephrology consult.",
    learningPoints: [
      "Avoid nephrotoxic drugs in CKD.",
      "Fluid overload risk – daily weight and input/output chart needed.",
      "Fever treatment must be aligned with renal dosing."
    ]
  },
  {
    id: "CS03",
    title: "Dengue fever with falling platelets",
    conditions: ["Dengue", "Viral fever"],
    summary:
      "Young adult male admitted with high fever, body pain and progressively falling platelet counts.",
    management:
      "Strict bed rest, high oral fluids, daily platelet count, avoidance of NSAIDs, early escalation to higher care on warning signs.",
    learningPoints: [
      "Platelet trend is more important than single value.",
      "Avoid drugs that increase bleeding risk.",
      "Patient education on warning signs is critical."
    ]
  },
  {
    id: "CS04",
    title: "Diabetic foot infection (history case)",
    conditions: ["Diabetes"],
    summary:
      "Long-standing diabetic patient presented with small foot wound that became infected.",
    management:
      "Early wound assessment, foot offloading, antibiotics, sugar optimization, regular dressing and podiatry review.",
    learningPoints: [
      "Daily self-foot examination in diabetes is essential.",
      "Early small wound care can prevent major amputation.",
      "Tight glucose control improves healing."
    ]
  }
];

let lastScan = null;
const doctorNotes = {}; // { uid: [ { text, time } ] }

// --------------------------------------------------------
// API: NodeMCU -> /api/rfid
// --------------------------------------------------------
app.get("/api/rfid", (req, res) => {
  const uid = req.query.uid || "";
  const authorized = req.query.auth === "1";

  console.log(`[RFID] UID=${uid}, authorized=${authorized}`);

  const patient = patients[uid] || null;
  lastScan = {
    uid,
    authorized,
    patient,
    timestamp: new Date().toISOString()
  };

  res.json({
    status: "ok",
    uid,
    authorized,
    patient_found: !!patient,
    patient
  });
});

// --------------------------------------------------------
// API: dashboard polls last scan
// --------------------------------------------------------
app.get("/api/last-scan", (req, res) => {
  if (!lastScan) {
    return res.json({
      uid: "",
      authorized: false,
      patient_found: false,
      patient: null
    });
  }
  res.json(lastScan);
});

// --------------------------------------------------------
// API: get doctor notes
// --------------------------------------------------------
app.get("/api/notes", (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.json([]);
  res.json(doctorNotes[uid] || []);
});

// --------------------------------------------------------
// API: add doctor note
// --------------------------------------------------------
app.post("/api/notes", (req, res) => {
  const { uid, note } = req.body;
  if (!uid || !note) {
    return res
      .status(400)
      .json({ status: "error", message: "uid and note required" });
  }
  if (!doctorNotes[uid]) {
    doctorNotes[uid] = [];
  }
  doctorNotes[uid].push({
    text: note,
    time: new Date().toLocaleString()
  });
  res.json({ status: "ok" });
});

// --------------------------------------------------------
// API: Case studies
// --------------------------------------------------------
app.get("/api/case-studies", (req, res) => {
  const uid = req.query.uid;
  if (!uid || !patients[uid]) {
    return res.json({
      status: "ok",
      items: caseStudies
    });
  }

  const patient = patients[uid];
  const diseaseText = (
    patient.disease +
    " " +
    (patient.medical?.currentDiagnosis?.primary || "") +
    " " +
    (patient.medical?.currentDiagnosis?.secondary || []).join(" ")
  ).toLowerCase();

  const filtered = caseStudies.filter((cs) =>
    cs.conditions.some((cond) => diseaseText.includes(cond.toLowerCase()))
  );

  res.json({
    status: "ok",
    items: filtered.length > 0 ? filtered : caseStudies
  });
});

// --------------------------------------------------------
// NEW: API – generate Diet Plan PDF for a patient
// --------------------------------------------------------
app.get("/api/diet-pdf", (req, res) => {
  const uid = req.query.uid;
  if (!uid || !patients[uid]) {
    return res.status(404).send("Patient not found for this UID.");
  }
  const patient = patients[uid];
  const diet = patient.dietPlan;
  if (!diet) {
    return res.status(404).send("No diet plan available for this patient.");
  }

  const doc = new PDFDocument({ margin: 40 });
  const filename = `diet_${patient.id || "patient"}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );

  doc.pipe(res);

  // Title
  doc
    .fontSize(20)
    .text("MediAssist – Diet Plan", { align: "center" })
    .moveDown(0.5);
  doc
    .fontSize(10)
    .fillColor("#555555")
    .text("Generated by MediAssist Smart EMR Dashboard", { align: "center" })
    .moveDown(1);

  // Patient Info
  doc.fillColor("#000000");
  doc.fontSize(12).text("Patient Details", { underline: true });
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .text(`Name: ${patient.name}`)
    .text(`Patient ID: ${patient.id}`)
    .text(`Age / Gender: ${patient.age} / ${patient.gender}`)
    .text(`Primary Condition: ${patient.disease}`)
    .moveDown(0.8);

  // Diet Summary
  doc.fontSize(12).text("Diet Summary", { underline: true });
  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .text(`Goal: ${diet.goal || "-"}`)
    .text(`Calories: ${diet.calories || "-"}`)
    .text(`Meal Pattern: ${diet.pattern || "-"}`)
    .moveDown(0.8);

  // Helper to print bullet list
  function bulletList(title, items) {
    doc.fontSize(11).text(title);
    doc.moveDown(0.2);
    doc.fontSize(10);
    if (!items || !items.length) {
      doc.text("• Not specified").moveDown(0.3);
      return;
    }
    items.forEach((item) => {
      doc.text(`• ${item}`);
    });
    doc.moveDown(0.5);
  }

  // Meals
  doc.fontSize(12).text("Meals", { underline: true }).moveDown(0.3);
  bulletList("Breakfast:", diet.meals?.breakfast);
  bulletList("Mid-morning:", diet.meals?.midMorning);
  bulletList("Lunch:", diet.meals?.lunch);
  bulletList("Evening Snack:", diet.meals?.eveningSnack);
  bulletList("Dinner:", diet.meals?.dinner);

  // Avoid
  doc.fontSize(12).text("Foods to Avoid", { underline: true }).moveDown(0.3);
  bulletList("", diet.avoid);

  // Extra
  doc.fontSize(12).text("Extra Notes", { underline: true }).moveDown(0.3);
  bulletList("", diet.extra);

  doc.moveDown(1);
  doc
    .fontSize(8)
    .fillColor("#777777")
    .text(
      "Note: This diet plan is generated for demonstration and should be reviewed by a qualified dietician/doctor.",
      { align: "left" }
    );

  doc.end();
});

// --------------------------------------------------------
// API: Chatbot using Gemini – SHORT ANSWERS
// --------------------------------------------------------
app.post("/api/chatbot", async (req, res) => {
  try {
    const { uid, role, question } = req.body;

    if (!question || !uid) {
      return res
        .status(400)
        .json({ status: "error", message: "uid and question required" });
    }

    const patient = patients[uid];
    if (!patient) {
      return res
        .status(404)
        .json({ status: "error", message: "Patient not found for this UID" });
    }

    const userRole = role || "nurse";

    const systemPrompt = `
You are a medical support chatbot inside a hospital dashboard.
You assist nurses, doctors, caretakers, and paramedics.

You are only allowed to answer based on THIS PATIENT'S CONTEXT and general safe first-aid / discharge-style information.

PATIENT CONTEXT (JSON):
${JSON.stringify(patient, null, 2)}

STRICT STYLE RULES (VERY IMPORTANT):
- Answer must be SHORT and PRECISE.
- Use ONLY 3 to 5 bullet points.
- Total answer should be roughly 40–80 words.
- No long paragraphs, no story, no greetings, no extra explanations.
- Directly start with the steps or key points.
- Do NOT repeat the question.
- Do NOT add disclaimers unless it is an emergency.

CONTENT RULES:
- You can give:
  * First aid guidance
  * Basic monitoring instructions
  * Discharge-style instructions
  * Safety precautions
- Do NOT:
  * Make new diagnoses not implied by the data
  * Prescribe exact drug names or doses
  * Replace the doctor's decision

EMERGENCY RULE:
- If the question describes unconsciousness, seizure, chest pain, or severe breathing difficulty:
  * Include one bullet saying:
    "This is an emergency. Follow hospital protocol and call a doctor or emergency services immediately."
`;

    const finalPrompt = `
${systemPrompt}

USER ROLE: ${userRole}
USER QUESTION: ${question}
`;

    console.log("🔍 Sending prompt to Gemini...");
    const result = await geminiModel.generateContent(finalPrompt);
    const response = result.response;
    const text = await response.text();
    console.log("✅ Gemini response received.");

    res.json({
      status: "ok",
      answer: text
    });
  } catch (err) {
    console.error("❌ Chatbot error:", err);
    res
      .status(500)
      .json({ status: "error", message: "Chatbot failed. Check server logs." });
  }
});

// --------------------------------------------------------
// Dashboard HTML
// --------------------------------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

// --------------------------------------------------------
// Start server
// --------------------------------------------------------
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
